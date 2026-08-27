"use client";

import { useRef } from "react";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineCreateButton } from "@/features/shared/inline-create-button";
import { useUniformLabelWidth } from "@/features/shared/use-max-text-width";
import { toggleFullscreen, useFullscreenSync } from "@/features/shared/use-fullscreen";
import { TimelineDaysProvider } from "@/features/timeline/timeline-context";
import { TimelineHeader } from "@/features/timeline/timeline-header";
import { TimelineToolbar } from "@/features/timeline/timeline-toolbar";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
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

/** 階層構造（Group/Subgroup/Project/Phase）のCRUD一式を提供するルートコンポーネント。 */
export function HierarchyTree({ userId }: HierarchyTreeProps) {
  const { groups, projects, phases, phaseStatuses, isLoading, isError, errors } =
    useHierarchyData();
  const createGroup = useCreateGroup();
  const phaseSortMode = useUiStore((s) => s.phaseSortMode);
  const setPhaseSortMode = useUiStore((s) => s.setPhaseSortMode);
  const isFullscreen = useUiStore((s) => s.isFullscreen);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useFullscreenSync(containerRef);

  const tree = buildHierarchyTree(groups, projects, phases);
  const rootLabelWidth = useUniformLabelWidth(tree.map((g) => g.name), {
    className: "font-semibold",
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  if (isError) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm text-destructive">
        <p>データの取得に失敗しました。時間をおいて再読み込みしてください。</p>
        {/* 原因調査用：本来は非表示にすべきだが、間欠的に発生する不具合の原因特定のため一時的に表示する */}
        <ul className="list-disc pl-5 font-mono text-xs">
          {errors.map(({ label, error }) => (
            <li key={label}>
              {label}: {error.message}
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => location.reload()}>
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 flex-col overflow-hidden",
        isFullscreen && "h-screen w-screen bg-background",
      )}
    >
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
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Phase並び替え:</span>
              <Button
                type="button"
                variant={phaseSortMode === "manual" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPhaseSortMode("manual")}
              >
                追加順
              </Button>
              <Button
                type="button"
                variant={phaseSortMode === "status" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPhaseSortMode("status")}
              >
                status順
              </Button>
            </div>
            <PhaseStatusFilter />
            <PhaseStatusManager userId={userId} />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => toggleFullscreen(containerRef)}
              title={isFullscreen ? "全画面表示を終了" : "全画面表示"}
            >
              {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
            </Button>
          </div>
        </div>

        <TimelineDaysProvider scrollContainerRef={scrollContainerRef}>
          <div ref={scrollContainerRef} className="flex-1 overflow-auto">
            <TimelineHeader />
            {tree.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Groupがまだありません。「+ Group」から作成してください。
              </p>
            ) : (
              <div className="flex flex-col gap-1 py-1">
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
            )}
          </div>
        </TimelineDaysProvider>
      </PhaseStatusesProvider>
    </div>
  );
}
