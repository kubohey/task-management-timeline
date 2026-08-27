"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/features/shared/color-picker";
import { InlineCreateButton } from "@/features/shared/inline-create-button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { useUniformLabelWidth } from "@/features/shared/use-max-text-width";
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

  const phases =
    phaseSortMode === "status"
      ? [...project.phases].sort(
          (a, b) =>
            (STATUS_SORT_ORDER[a.status ?? ""] ?? 99) -
            (STATUS_SORT_ORDER[b.status ?? ""] ?? 99),
        )
      : project.phases;

  const phaseLabelWidth = useUniformLabelWidth(phases.map((p) => p.name));

  return (
    <div>
      <div
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
        style={{ marginLeft: depth * INDENT_STEP_PX, backgroundColor: project.color ?? undefined }}
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
      {!project.is_collapsed && phases.length > 0 && (
        <div className="flex flex-col gap-1 py-1">
          {phases.map((phase) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              depth={depth + 1}
              labelWidth={phaseLabelWidth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
