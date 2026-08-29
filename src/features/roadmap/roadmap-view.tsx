"use client";

import { useEffect, useMemo, useRef } from "react";
import { ZoomControl } from "@/features/shared/zoom-control";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { AddRoadmapColumnButton } from "./add-roadmap-column-button";
import { RoadmapColumnHeader } from "./roadmap-column-header";
import { RoadmapColumnStrip } from "./roadmap-column-strip";
import { useRoadmapData } from "./use-roadmap-data";
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
/** マウント時に今週をこの週数分だけ上に余白を残してスクロールする。 */
const SCROLL_LEAD_WEEKS = 3;

/**
 * ロードマップタブ本体。週単位（月曜始まり）の行×Project単位の列でタスクを俯瞰する、
 * メインのガントチャートとは軸を入れ替えた画面（docs/spec.md §2.6）。
 */
export function RoadmapView({ userId }: RoadmapViewProps) {
  const { columns, tasks, projects, phases, isLoading, isError } = useRoadmapData();
  const weeks = useMemo(() => getRoadmapWeeks(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const roadmapZoomPercent = useUiStore((s) => s.roadmapZoomPercent);
  const setRoadmapZoomPercent = useUiStore((s) => s.setRoadmapZoomPercent);
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

  // 初回表示時、今週が少し余白を残して見える位置までスクロールする。
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayIndex = weeks.findIndex((week) => isCurrentWeek(week));
    if (todayIndex === -1) return;
    const zoomFactor = zoomRef.current / 100;
    scrollRef.current.scrollTop = Math.max(
      0,
      (todayIndex - SCROLL_LEAD_WEEKS) * WEEK_ROW_HEIGHT_PX * zoomFactor,
    );
    // 初回マウント時のみでよい。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }
  if (isError) {
    return <div className="p-4 text-sm text-destructive">Failed to load data.</div>;
  }

  const totalWidth =
    WEEK_LABEL_WIDTH_PX + columns.reduce((sum, c) => sum + c.width, 0) + ADD_COLUMN_SLOT_WIDTH_PX;

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
          <div className="sticky top-0 z-20 flex border-b bg-background">
            <div
              className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-background px-2 py-1.5 text-sm font-semibold"
              style={{ width: WEEK_LABEL_WIDTH_PX }}
            >
              Week
            </div>
            {columns.map((column) => (
              <RoadmapColumnHeader key={column.id} column={column} />
            ))}
            <div
              className="flex shrink-0 items-center justify-center"
              style={{ width: ADD_COLUMN_SLOT_WIDTH_PX }}
            >
              <AddRoadmapColumnButton userId={userId} projects={projects} sortOrder={columns.length} />
            </div>
          </div>

          {columns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No columns yet. Add one with the &quot;+&quot; button above and choose a project.
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
                  weeks={weeks}
                  tasks={tasksByColumn.get(column.id) ?? []}
                  projects={projects}
                  phases={phases}
                  projectsById={projectsById}
                  phasesById={phasesById}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
