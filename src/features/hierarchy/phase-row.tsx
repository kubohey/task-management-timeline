"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  Maximize2Icon,
  TableIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { PhaseTableDialog } from "@/features/phase-table/phase-table-dialog";
import { PhaseTablePanel } from "@/features/phase-table/phase-table-panel";
import { TABLE_ROW_SORTABLE_PREFIX } from "@/features/phase-table/phase-table";
import { useReorderRows } from "@/features/phase-table/use-phase-table-mutations";
import { usePhaseTableData } from "@/features/phase-table/use-phase-table-data";
import { PhaseTimelineCells } from "@/features/task-placement/phase-timeline-cells";
import { useCreatePlacement } from "@/features/task-placement/use-task-placement-mutations";
import { SIDEBAR_WIDTH_PX } from "@/features/timeline/constants";
import { useTimelineDays } from "@/features/timeline/timeline-context";
import { cn } from "@/lib/utils";
import { INDENT_STEP_PX } from "./constants";
import { StatusSelect } from "./status-select";
import { useDeletePhase, useUpdatePhase } from "./use-hierarchy-mutations";
import type { PhaseRecord } from "./types";

/**
 * インライン表示のタスク表の最大幅（px）。行の幅（サイドバー＋カレンダー全幅）
 * いっぱいに広げるが、年表示は総日数が365日分と非常に広くなるため、そのまま
 * 使うと表が際限なく横に伸びてしまう。実用的な広さに収まるよう上限を設ける。
 */
const TABLE_PANEL_MAX_WIDTH_PX = 1800;

interface PhaseRowProps {
  phase: PhaseRecord;
  depth: number;
  labelWidth: number;
  /** タイムライン上のタスクチップの色をこのProjectの色に揃える。 */
  projectColor: string | null;
  /** 表示順の番号（1始まり）。現在表示されている並び順での位置をそのまま表す。 */
  orderNumber: number;
  /**
   * 上/下のPhaseと入れ替えるハンドラ。追加順表示（status順ではない）かつ
   * 入れ替え先が存在するときだけ渡される（境界・status順表示時はundefined＝ボタン無効）。
   */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /**
   * ドラッグ並び替え用のグリップに渡すdnd-kitのハンドラ一式。SortablePhaseRow
   * （project-row.tsxから使われる）経由でのみ渡され、追加順表示のときだけ存在する
   * （onMoveUp/onMoveDownと同じくundefined＝グリップ非表示）。
   */
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
}

/**
 * Phase行：名前編集、status付与、削除。表示順の番号を振り、追加順表示のときは
 * 上下のPhaseと入れ替えられる（ユーザー要望：「追加した順番に表示されるので、
 * 上下に入れ替える機能があると嬉しい」）。
 * タスク表はカレンダーと並べて見えるインライン展開、または単体ダイアログの2通りで開ける。
 * インライン表示の表からタイムラインの日付セルへ行をドラッグ登録できる（docs/spec.md §2.2）。
 * 表内の行同士もドラッグで並び替えられる（PhaseTable側のSortableTableRow参照）。
 */
export function PhaseRow({
  phase,
  depth,
  labelWidth,
  projectColor,
  orderNumber,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: PhaseRowProps) {
  const [editing, setEditing] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const updatePhase = useUpdatePhase();
  const deletePhase = useDeletePhase();

  // タイムラインのチップ表示にはテーブルの開閉に関わらず列/行/セルが必要なため常時取得する。
  const { columns, rows, isLoading, isError } = usePhaseTableData(phase.id, true);

  const createPlacement = useCreatePlacement();
  const reorderRows = useReorderRows();
  const { totalWidth } = useTimelineDays();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [draggingTaskName, setDraggingTaskName] = useState<string | null>(null);
  // 表内の行並び替え中は横方向のオートスクロールを止めるためのフラグ。
  // 詳細はDndContextのautoScrollに渡している箇所のコメント参照。
  const [isReordering, setIsReordering] = useState(false);

  // このDndContextは2種類のドラッグを扱う：
  // ①表の行のグリップ（`row:${rowId}`）→カレンダー日付セル（`day:...`）で予定登録
  // ②表の行の並び替えグリップ（`${TABLE_ROW_SORTABLE_PREFIX}${rowId}`）同士で行の順序入れ替え
  // idの接頭辞で判別する。DragOverlayは①のときだけ表示する。
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id;
    if (typeof id === "string" && id.startsWith("row:")) {
      setDraggingTaskName((event.active.data.current?.taskName as string | undefined) || "(無題のタスク)");
    }
    setIsReordering(typeof id === "string" && id.startsWith(TABLE_ROW_SORTABLE_PREFIX));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingTaskName(null);
    setIsReordering(false);
    const activeId = event.active.id;
    const overId = event.over?.id;
    if (typeof activeId !== "string" || typeof overId !== "string") {
      return;
    }

    if (activeId.startsWith("row:") && overId.startsWith("day:")) {
      const [, , date] = overId.split(":");
      const rowId = event.active.data.current?.rowId as string | undefined;
      if (!rowId || !date) {
        return;
      }
      createPlacement.mutate({ sourceRowId: rowId, date, phaseId: phase.id });
      return;
    }

    if (
      activeId.startsWith(TABLE_ROW_SORTABLE_PREFIX) &&
      overId.startsWith(TABLE_ROW_SORTABLE_PREFIX) &&
      activeId !== overId
    ) {
      const activeRowId = activeId.slice(TABLE_ROW_SORTABLE_PREFIX.length);
      const overRowId = overId.slice(TABLE_ROW_SORTABLE_PREFIX.length);
      const oldIndex = rows.findIndex((r) => r.row.id === activeRowId);
      const newIndex = rows.findIndex((r) => r.row.id === overRowId);
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      const reordered = arrayMove(rows, oldIndex, newIndex);
      reorderRows.mutate({ phaseId: phase.id, orderedRowIds: reordered.map((r) => r.row.id) });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingTaskName(null);
        setIsReordering(false);
      }}
      // 表の行並び替え（縦方向のみの操作）中は、ページ全体を包む横スクロール可能な
      // 祖先コンテナ（hierarchy-tree.tsxのscrollContainerRef）まで巻き込まれて
      // カレンダーが横スクロールしてしまうのを防ぐため、横方向のしきい値を0にする。
      // カレンダー登録ドラッグ（行→日付セル）のときは従来どおりの挙動のままにする。
      autoScroll={{ threshold: { x: isReordering ? 0 : 0.2, y: 0.2 } }}
    >
      <div>
        {/* 行の幅を明示的に指定する理由はgroup-row.tsxのコメント参照。 */}
        <div className="flex items-stretch" style={{ width: SIDEBAR_WIDTH_PX + totalWidth }}>
          <div
            className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border border-transparent bg-background px-2 py-1.5 hover:border-border"
            style={{ width: SIDEBAR_WIDTH_PX, paddingLeft: depth * INDENT_STEP_PX + 8 }}
          >
            {dragHandleProps && (
              <button
                type="button"
                className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                title="ドラッグして並び替え"
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              >
                <GripVerticalIcon className="size-3.5" />
              </button>
            )}
            {(onMoveUp || onMoveDown) && (
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-4"
                  disabled={!onMoveUp}
                  onClick={onMoveUp}
                  title="上のPhaseと入れ替え"
                >
                  <ArrowUpIcon className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-4"
                  disabled={!onMoveDown}
                  onClick={onMoveDown}
                  title="下のPhaseと入れ替え"
                >
                  <ArrowDownIcon className="size-3" />
                </Button>
              </div>
            )}
            <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
              {orderNumber}.
            </span>
            <InlineEditableText
              value={phase.name}
              editing={editing}
              onEditingChange={setEditing}
              onSubmit={(name) => updatePhase.mutate({ id: phase.id, patch: { name } })}
              className="font-medium"
              style={{ width: labelWidth }}
            />
            <StatusSelect
              statusId={phase.status_id}
              onChange={(status_id) => updatePhase.mutate({ id: phase.id, patch: { status_id } })}
            />
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditing(true)}
                title="名前を編集"
              >
                ✏️
              </Button>
              <Button
                type="button"
                variant={tableOpen ? "secondary" : "ghost"}
                size="icon-xs"
                title={
                  tableOpen
                    ? "タスク表を閉じる（カレンダーと並べて表示）"
                    : "タスク表を開く（カレンダーと並べて表示）"
                }
                onClick={() => setTableOpen((v) => !v)}
              >
                <TableIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="タスク表を単体で開く"
                onClick={() => setTableDialogOpen(true)}
              >
                <Maximize2Icon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="Phaseを削除"
                onClick={() => {
                  if (confirm(`Phase「${phase.name}」を削除しますか？`)) {
                    deletePhase.mutate(phase.id);
                  }
                }}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
          <PhaseTimelineCells
            phaseId={phase.id}
            columns={columns}
            rows={rows}
            chipColor={projectColor}
          />
        </div>
        {tableOpen && (
          // タスク表を開いたとき、以前は幅をw-fit（内容に合わせて縮む）にしていたため
          // サイドバー幅程度の狭い列に収まってしまい、テキストが折り返して縦に長くなり、
          // 表自体の内部スクロールを何度もしないと追加したいセルが見えなくなっていた
          // （ユーザー提供の修正案画像「タスクの追加方向が上なので…追加したいセルが
          // 見えなくなる」）。行の幅（サイドバー＋カレンダー全体）いっぱいまで広げ、
          // 横方向のスペースを活用することで折り返しを減らし、一覧性を確保する
          // （画像の「タスクの追加方向を横方向にする」）。
          <div
            className="sticky left-0 z-10 bg-background"
            style={{
              width: Math.min(SIDEBAR_WIDTH_PX + totalWidth, TABLE_PANEL_MAX_WIDTH_PX),
              paddingLeft: depth * INDENT_STEP_PX + 8,
            }}
          >
            <PhaseTablePanel
              phaseId={phase.id}
              columns={columns}
              rows={rows}
              isLoading={isLoading}
              isError={isError}
            />
          </div>
        )}
        <PhaseTableDialog
          phaseId={phase.id}
          phaseName={phase.name}
          open={tableDialogOpen}
          onOpenChange={setTableDialogOpen}
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          isError={isError}
        />
      </div>
      <DragOverlay>
        {draggingTaskName && (
          <div
            className={cn(
              "rounded px-2 py-1 text-xs shadow-md",
              projectColor ? "text-foreground" : "bg-primary text-primary-foreground",
            )}
            style={projectColor ? { backgroundColor: projectColor } : undefined}
          >
            {draggingTaskName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface SortablePhaseRowProps extends Omit<PhaseRowProps, "dragHandleProps"> {
  /** trueのとき（Phase並び替え：追加順表示）だけドラッググリップを表示・有効化する。 */
  draggable: boolean;
}

/**
 * project-row.tsxのSortableContext配下で使う、ドラッグ並び替え可能なPhase行の
 * 外側ラッパー。PhaseRow自身は行内でカレンダー登録用ドラッグ・表内行の並び替え用
 * ドラッグという別のDndContextを持つため、Phase同士の並び替えはこの外側で
 * useSortableを使い、グリップのattributes/listenersだけをPhaseRowへ渡す
 * （PhaseTable側のSortableTableRowと同じ考え方）。
 */
export function SortablePhaseRow({ draggable, ...phaseRowProps }: SortablePhaseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phaseRowProps.phase.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
        opacity: isDragging ? 0.6 : undefined,
      }}
    >
      <PhaseRow {...phaseRowProps} dragHandleProps={draggable ? { attributes, listeners } : undefined} />
    </div>
  );
}
