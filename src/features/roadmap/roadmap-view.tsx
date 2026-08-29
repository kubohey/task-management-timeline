"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { addWeeks, format, parseISO } from "date-fns";
import { ZoomControl } from "@/features/shared/zoom-control";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { AddRoadmapColumnButton } from "./add-roadmap-column-button";
import { RoadmapColumnHeader } from "./roadmap-column-header";
import { RoadmapColumnStrip } from "./roadmap-column-strip";
import { useRoadmapData } from "./use-roadmap-data";
import { useReorderRoadmapColumns, useUpdateRoadmapTask } from "./use-roadmap-mutations";
import {
  formatWeekLabel,
  getRoadmapWeeks,
  isCurrentWeek,
  weekKey,
  WEEK_LABEL_WIDTH_PX,
  WEEK_ROW_HEIGHT_PX,
} from "./week-utils";

interface RoadmapViewProps {
  userId: string;
}

/** 追加ボタン列の予備幅（px）。 */
const ADD_COLUMN_SLOT_WIDTH_PX = 40;

/**
 * ロードマップタブ本体。週単位（月曜始まり）の行×Project単位の列でタスクを俯瞰する、
 * メインのガントチャートとは軸を入れ替えた画面（docs/spec.md §2.6）。
 */
export function RoadmapView({ userId }: RoadmapViewProps) {
  const { columns, tasks, projects, phases, isLoading, isError } = useRoadmapData();
  const weeks = useMemo(() => getRoadmapWeeks(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 列見出し行（sticky top）の実測高さ。今週を画面中央に揃える計算で、
  // 常に画面上部を占有し続けるこの分を可視領域から差し引くために使う。
  const headerRef = useRef<HTMLDivElement>(null);
  const roadmapZoomPercent = useUiStore((s) => s.roadmapZoomPercent);
  const setRoadmapZoomPercent = useUiStore((s) => s.setRoadmapZoomPercent);
  const selectedRoadmapTaskIds = useUiStore((s) => s.selectedRoadmapTaskIds);
  const updateTask = useUpdateRoadmapTask();
  const reorderColumns = useReorderRoadmapColumns();
  const columnDragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  // scrollTopは実際の画面ピクセル（zoom適用後）で動くため、初回スクロール計算にも
  // zoom倍率を掛ける必要がある。マウント時点の値だけ使えばよいためrefで参照する。
  const zoomRef = useRef(roadmapZoomPercent);
  useEffect(() => {
    zoomRef.current = roadmapZoomPercent;
  }, [roadmapZoomPercent]);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const phasesById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const bucket = map.get(task.column_id) ?? [];
      bucket.push(task);
      map.set(task.column_id, bucket);
    }
    return map;
  }, [tasks]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  // 列幅ドラッグ中のライブ値。RoadmapColumnHeader（列見出し）とRoadmapColumnStrip
  // （その下の週セル・タスク列）は別コンポーネントで、どちらも本来column.widthを
  // 見て幅を決めるが、それだとドラッグ中は見出しだけが即座に動き、下のセル群は
  // DB更新→再取得が終わるまで古い幅のまま追随せず、コンマ何秒か遅れて幅が変わって
  // いるように見えていた（ユーザー報告：「Excelみたいに、ラベルの幅を変えるのと
  // 同時に下のセルも移動するようにして」）。見出し・セル双方がこのstateを共通の
  // ライブ幅として参照することで、ドラッグ中も常に同じ幅で同期させる。
  const [liveColumnWidths, setLiveColumnWidths] = useState<Record<string, number>>({});
  const getColumnWidth = (columnId: string, fallback: number) => liveColumnWidths[columnId] ?? fallback;
  const setLiveColumnWidth = (columnId: string, width: number | null) => {
    setLiveColumnWidths((prev) => {
      if (width === null) {
        if (!(columnId in prev)) return prev;
        const next = { ...prev };
        delete next[columnId];
        return next;
      }
      return { ...prev, [columnId]: width };
    });
  };

  // ドラッグ移動の確定処理。ドラッグされたタスクが複数選択中の一員なら、選択中の
  // タスクすべてを同じ週数・サブ列数だけまとめて移動する（列をまたいで選択されていてもよい）。
  // そうでなければ、そのタスク単体だけを移動する（従来どおり）。
  // ユーザー要望：「複数選択して同時にセルのドラッグができると嬉しい」
  // サブ列（lane）は各タスクが属する列のlane_countの範囲にクランプする
  // （選択したタスクが別々の列にまたがっていて、列ごとにサブ列数が異なっていてもよい）。
  const moveTaskGroup = (draggedTaskId: string, deltaWeeks: number, deltaLanes: number) => {
    if (deltaWeeks === 0 && deltaLanes === 0) {
      return;
    }
    const idsToMove =
      selectedRoadmapTaskIds.includes(draggedTaskId) && selectedRoadmapTaskIds.length > 1
        ? selectedRoadmapTaskIds
        : [draggedTaskId];
    for (const id of idsToMove) {
      const task = tasksById.get(id);
      if (!task) {
        continue;
      }
      const start = parseISO(task.start_week);
      const end = parseISO(task.end_week);
      const laneCount = columnsById.get(task.column_id)?.lane_count ?? 1;
      const nextLane = Math.min(laneCount - 1, Math.max(0, task.lane + deltaLanes));
      updateTask.mutate({
        id,
        patch: {
          start_week: format(addWeeks(start, deltaWeeks), "yyyy-MM-dd"),
          end_week: format(addWeeks(end, deltaWeeks), "yyyy-MM-dd"),
          lane: nextLane,
        },
      });
    }
  };

  // Project列（見出しのグリップ）をドラッグして並び替える
  // （ユーザー要望：「各プロジェクトの列をドラッグして、並び替えられるようにしてほしい」）。
  // hierarchy/project-row.tsxのPhase並び替え（handlePhaseDragEnd）と同じ方式。
  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const reordered = arrayMove(columns, oldIndex, newIndex);
    reorderColumns.mutate(reordered.map((c) => c.id));
  };

  // 初回表示時、今週が画面のちょうど中央あたりに来るようスクロール位置を調整する
  // （メインのガントチャートの「今日」自動スクロールと同じ考え方、縦方向版）。
  // isLoading中はまだ読み込み中メッセージしか描画されておらずscrollRef/headerRefが
  // 未接続のため、isLoadingをこの効果の依存配列に含め、実際のグリッドがマウントされた
  // （isLoadingがfalseになった）タイミングで実行する。
  useEffect(() => {
    if (isLoading) return;
    const container = scrollRef.current;
    if (!container) return;
    const todayIndex = weeks.findIndex((week) => isCurrentWeek(week));
    if (todayIndex === -1) return;
    const zoomFactor = zoomRef.current / 100;
    const rowHeight = WEEK_ROW_HEIGHT_PX * zoomFactor;
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const visibleHeight = container.clientHeight - headerHeight;
    if (visibleHeight <= 0) return;
    const todayCenterPos = todayIndex * rowHeight + rowHeight / 2;
    const targetScrollTop = todayCenterPos - visibleHeight / 2;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);
    // weeksは初回計算後に変化しないため依存配列に含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  if (isError) {
    return <div className="p-4 text-sm text-destructive">データの取得に失敗しました。</div>;
  }

  const totalWidth =
    WEEK_LABEL_WIDTH_PX +
    columns.reduce((sum, c) => sum + getColumnWidth(c.id, c.width), 0) +
    ADD_COLUMN_SLOT_WIDTH_PX;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <ZoomControl value={roadmapZoomPercent} onChange={setRoadmapZoomPercent} />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* 画面全体の拡大縮小（ZoomControl）はCSSのzoomプロパティで実現する。
            列見出し・週ラベルのsticky位置固定はスクロールコンテナ基準で効くため、
            このラッパーを挟んでも壊れない。 */}
        <div style={{ width: totalWidth, zoom: roadmapZoomPercent / 100 }}>
          <div ref={headerRef} className="sticky top-0 z-20 flex border-b bg-background">
            <div
              className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 py-1.5 text-sm font-semibold"
              style={{ width: WEEK_LABEL_WIDTH_PX }}
            >
              週単位
            </div>
            <DndContext
              sensors={columnDragSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((column) => (
                  <RoadmapColumnHeader
                    key={column.id}
                    column={column}
                    tasks={tasksByColumn.get(column.id) ?? []}
                    width={getColumnWidth(column.id, column.width)}
                    onLiveWidthChange={(width) => setLiveColumnWidth(column.id, width)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div
              className="flex shrink-0 items-center justify-center"
              style={{ width: ADD_COLUMN_SLOT_WIDTH_PX }}
            >
              <AddRoadmapColumnButton userId={userId} projects={projects} sortOrder={columns.length} />
            </div>
          </div>

          {columns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              列がまだありません。右上の「＋」からProjectを選んで列を追加してください。
            </p>
          ) : (
            <div className="flex">
              <div
                className="sticky left-0 z-10 flex shrink-0 flex-col border-r bg-background"
                style={{ width: WEEK_LABEL_WIDTH_PX }}
              >
                {weeks.map((week) => (
                  <div
                    key={weekKey(week)}
                    className={cn(
                      "shrink-0 border-b px-2 py-1 text-xs",
                      isCurrentWeek(week) && "bg-green-400/25 font-semibold",
                    )}
                    style={{ height: WEEK_ROW_HEIGHT_PX }}
                  >
                    {formatWeekLabel(week)}
                  </div>
                ))}
              </div>
              {columns.map((column) => (
                <RoadmapColumnStrip
                  key={column.id}
                  column={column}
                  width={getColumnWidth(column.id, column.width)}
                  weeks={weeks}
                  tasks={tasksByColumn.get(column.id) ?? []}
                  projects={projects}
                  phases={phases}
                  projectsById={projectsById}
                  phasesById={phasesById}
                  onMoveTask={moveTaskGroup}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
