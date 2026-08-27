"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/features/shared/color-picker";
import { InlineCreateButton } from "@/features/shared/inline-create-button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { useUniformLabelWidth } from "@/features/shared/use-max-text-width";
import { CalendarRowCells } from "@/features/timeline/calendar-row-cells";
import { SIDEBAR_WIDTH_PX } from "@/features/timeline/constants";
import { useTimelineDays } from "@/features/timeline/timeline-context";
import { useUiStore } from "@/store/ui-store";
import type { ProjectNode } from "./build-tree";
import { INDENT_STEP_PX } from "./constants";
import { PhaseRow } from "./phase-row";
import { STATUS_SORT_ORDER } from "./status-select";
import { useCreatePhase, useDeleteProject, useUpdateProject } from "./use-hierarchy-mutations";

interface ProjectRowProps {
  project: ProjectNode;
  depth: number;
  labelWidth: number;
}

/** Project行：名前編集、色編集、Phase追加、折りたたみ、削除。配下にPhase一覧を表示。 */
export function ProjectRow({ project, depth, labelWidth }: ProjectRowProps) {
  const [editing, setEditing] = useState(false);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createPhase = useCreatePhase();
  const phaseSortMode = useUiStore((s) => s.phaseSortMode);
  const hiddenPhaseStatuses = useUiStore((s) => s.hiddenPhaseStatuses);

  const sortedPhases =
    phaseSortMode === "status"
      ? [...project.phases].sort(
          (a, b) =>
            (STATUS_SORT_ORDER[a.status ?? ""] ?? 99) -
            (STATUS_SORT_ORDER[b.status ?? ""] ?? 99),
        )
      : project.phases;

  const phases = sortedPhases.filter(
    (phase) => !hiddenPhaseStatuses.includes(phase.status ?? "none"),
  );

  const phaseLabelWidth = useUniformLabelWidth(phases.map((p) => p.name));
  const { totalWidth } = useTimelineDays();

  return (
    <div>
      {/* 行の幅を明示的に指定する理由はgroup-row.tsxのコメント参照。 */}
      <div className="flex items-stretch" style={{ width: SIDEBAR_WIDTH_PX + totalWidth }}>
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 px-2 py-1.5"
          style={{
            width: SIDEBAR_WIDTH_PX,
            paddingLeft: depth * INDENT_STEP_PX + 8,
            backgroundColor: project.color ?? "var(--color-background)",
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={project.phases.length === 0}
            onClick={() =>
              updateProject.mutate({
                id: project.id,
                patch: { is_collapsed: !project.is_collapsed },
              })
            }
            title="Phaseの折りたたみ"
          >
            {project.is_collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          </Button>
          <InlineEditableText
            value={project.name}
            editing={editing}
            onEditingChange={setEditing}
            onSubmit={(name) => updateProject.mutate({ id: project.id, patch: { name } })}
            className="font-medium"
            style={{ width: labelWidth }}
          />
          <InlineCreateButton
            label="Phase"
            onCreate={(name) =>
              createPhase.mutate({
                projectId: project.id,
                name,
                sortOrder: project.phases.length,
              })
            }
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
            <ColorPicker
              color={project.color}
              onChange={(color) => updateProject.mutate({ id: project.id, patch: { color } })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Projectを削除"
              onClick={() => {
                if (
                  confirm(`Project「${project.name}」を削除しますか？（配下のPhaseも削除されます）`)
                ) {
                  deleteProject.mutate(project.id);
                }
              }}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
        <CalendarRowCells />
      </div>
      {!project.is_collapsed && phases.length > 0 && (
        <div className="flex flex-col gap-1 py-1">
          {phases.map((phase) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              depth={depth + 1}
              labelWidth={phaseLabelWidth}
              projectColor={project.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
