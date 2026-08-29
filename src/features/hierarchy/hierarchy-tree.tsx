"use client";

import { useRef } from "react";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyNoteSidebar } from "@/features/daily-note/daily-note-sidebar";
import { InlineCreateButton } from "@/features/shared/inline-create-button";
import { useUniformLabelWidth } from "@/features/shared/use-max-text-width";
import { toggleFullscreen, useFullscreenSync } from "@/features/shared/use-fullscreen";
import { ZoomControl } from "@/features/shared/zoom-control";
import { SIDEBAR_WIDTH_PX } from "@/features/timeline/constants";
import { TimelineDaysProvider, useTimelineDays } from "@/features/timeline/timeline-context";
import { TimelineHeader } from "@/features/timeline/timeline-header";
import { TimelineToolbar } from "@/features/timeline/timeline-toolbar";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import type { GroupNode } from "./build-tree";
import { buildHierarchyTree } from "./build-tree";
import { GroupRow } from "./group-row";
import { PhaseStatusFilter } from "./phase-status-filter";
import { PhaseStatusManager } from "./phase-status-manager";
import { PhaseStatusesProvider } from "./phase-statuses-context";
import { useCreateGroup } from "./use-hierarchy-mutations";
import { useHierarchyData } from "./use-hierarchy-data";

interface HierarchyTreeProps {
  userId: string;
}

interface GroupsColumnProps {
  tree: GroupNode[];
  rootLabelWidth: number;
  userId: string;
}

/**
 * トップレベルGroup一覧の折りたたみ配下ラッパー。幅を明示的に指定する必要がある
 * （group-row.tsxのコメント参照）ため、useTimelineDays()を呼べるようHierarchyTree
 * 本体とは別コンポーネントに切り出す（HierarchyTree自身はTimelineDaysProviderを
 * 返す側であり、Provider配下では実行されないためこのフックを直接呼べない）。
 */
function GroupsColumn({ tree, rootLabelWidth, userId }: GroupsColumnProps) {
  const { totalWidth } = useTimelineDays();
  return (
    <div className="flex flex-col gap-1 py-1" style={{ width: SIDEBAR_WIDTH_PX + totalWidth }}>
      {tree.map((group) => (
        <GroupRow
          key={group.id}
          group={group}
          depth={0}
          labelWidth={rootLabelWidth}
          userId={userId}
          allowSubgroup
        />
      ))}
    </div>
  );
}

/** 階層構造（Group/Subgroup/Project/Phase）のCRUD一式を提供するルートコンポーネント。 */
export function HierarchyTree({ userId }: HierarchyTreeProps) {
  const { groups, projects, phases, phaseStatuses, isLoading, isError, errors } =
    useHierarchyData();
  const createGroup = useCreateGroup();
  const phaseSortMode = useUiStore((s) => s.phaseSortMode);
  const setPhaseSortMode = useUiStore((s) => s.setPhaseSortMode);
  const isFullscreen = useUiStore((s) => s.isFullscreen);
  const dailyNoteDate = useUiStore((s) => s.dailyNoteDate);
  const ganttZoomPercent = useUiStore((s) => s.ganttZoomPercent);
  const setGanttZoomPercent = useUiStore((s) => s.setGanttZoomPercent);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useFullscreenSync(containerRef);

  const tree = buildHierarchyTree(groups, projects, phases);
  const rootLabelWidth = useUniformLabelWidth(tree.map((g) => g.name), {
    className: "font-semibold",
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }
  if (isError) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm text-destructive">
        <p>Failed to load data. Please wait a moment and reload.</p>
        {/* 原因調査用：本来は非表示にすべきだが、間欠的に発生する不具合の原因特定のため一時的に表示する */}
        <ul className="list-disc pl-5 font-mono text-xs">
          {errors.map(({ label, error }) => (
            <li key={label}>
              {label}: {error.message}
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => location.reload()}>
          Reload
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-1 overflow-hidden", isFullscreen && "h-screen w-screen bg-background")}
    >
      {/* デイリータスクノート（右サイドバー）を並べて表示できるよう、本体は縦積みのまま
          横並びの左ペインとして切り出す（min-w-0でサイドバー分だけ幅が縮むようにする）。 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PhaseStatusesProvider statuses={phaseStatuses}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <InlineCreateButton
              label="Group"
              onCreate={(name) =>
                createGroup.mutate({ userId, name, parentGroupId: null, sortOrder: tree.length })
              }
            />
            <div className="flex flex-wrap items-center gap-4">
              <TimelineToolbar />
              <ZoomControl value={ganttZoomPercent} onChange={setGanttZoomPercent} />
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Sort phases:</span>
                <Button
                  type="button"
                  variant={phaseSortMode === "manual" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPhaseSortMode("manual")}
                >
                  Added order
                </Button>
                <Button
                  type="button"
                  variant={phaseSortMode === "status" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPhaseSortMode("status")}
                >
                  By status
                </Button>
              </div>
              <PhaseStatusFilter />
              <PhaseStatusManager userId={userId} />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => toggleFullscreen(containerRef)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
              </Button>
            </div>
          </div>

          <TimelineDaysProvider scrollContainerRef={scrollContainerRef}>
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">
              {/* 画面全体の拡大縮小（ZoomControl）はCSSのzoomプロパティで実現する。
                  日付ヘッダーの位置固定（sticky）はスクロールコンテナ基準で効くため、
                  このラッパーを挟んでも壊れない。 */}
              <div style={{ zoom: ganttZoomPercent / 100 }}>
                <TimelineHeader />
                {tree.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No groups yet. Create one with &quot;+ Group&quot;.
                  </p>
                ) : (
                  <GroupsColumn tree={tree} rootLabelWidth={rootLabelWidth} userId={userId} />
                )}
              </div>
            </div>
          </TimelineDaysProvider>
        </PhaseStatusesProvider>
      </div>
      {dailyNoteDate && <DailyNoteSidebar userId={userId} date={dailyNoteDate} />}
    </div>
  );
}
