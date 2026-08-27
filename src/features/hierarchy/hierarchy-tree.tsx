"use client";

import { Button } from "@/components/ui/button";
import { InlineCreateButton } from "@/features/shared/inline-create-button";
import { useUniformLabelWidth } from "@/features/shared/use-max-text-width";
import { TimelineDaysProvider } from "@/features/timeline/timeline-context";
import { TimelineHeader } from "@/features/timeline/timeline-header";
import { TimelineToolbar } from "@/features/timeline/timeline-toolbar";
import { useUiStore } from "@/store/ui-store";
import { buildHierarchyTree } from "./build-tree";
import { GroupRow } from "./group-row";
import { useCreateGroup } from "./use-hierarchy-mutations";
import { useHierarchyData } from "./use-hierarchy-data";

interface HierarchyTreeProps {
  userId: string;
}

/** 階層構造（Group/Subgroup/Project/Phase）のCRUD一式を提供するルートコンポーネント。 */
export function HierarchyTree({ userId }: HierarchyTreeProps) {
  const { groups, projects, phases, isLoading, isError } = useHierarchyData();
  const createGroup = useCreateGroup();
  const phaseSortMode = useUiStore((s) => s.phaseSortMode);
  const setPhaseSortMode = useUiStore((s) => s.setPhaseSortMode);

  const tree = buildHierarchyTree(groups, projects, phases);
  const rootLabelWidth = useUniformLabelWidth(tree.map((g) => g.name), {
    className: "font-semibold",
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  if (isError) {
    return <div className="p-4 text-sm text-destructive">データの取得に失敗しました。</div>;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <InlineCreateButton
          label="Group"
          onCreate={(name) =>
            createGroup.mutate({ userId, name, parentGroupId: null, sortOrder: tree.length })
          }
        />
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      <TimelineDaysProvider>
        <div className="flex-1 overflow-auto">
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
    </div>
  );
}
