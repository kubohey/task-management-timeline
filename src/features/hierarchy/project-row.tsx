"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { SortablePhaseRow } from "./phase-row";
import { usePhaseStatuses } from "./phase-statuses-context";
import {
  useCreatePhase,
  useDeleteProject,
  useReorderPhases,
  useUpdatePhase,
  useUpdateProject,
} from "./use-hierarchy-mutations";

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
  const updatePhase = useUpdatePhase();
  const reorderPhases = useReorderPhases();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const phaseSortMode = useUiStore((s) => s.phaseSortMode);
  const hiddenPhaseStatuses = useUiStore((s) => s.hiddenPhaseStatuses);
  const statuses = usePhaseStatuses();
  const statusSortOrder = useMemo(
    () => new Map(statuses.map((s) => [s.id, s.sort_order])),
    [statuses],
  );

  const sortedPhases =
    phaseSortMode === "status"
      ? [...project.phases].sort(
          (a, b) =>
            (statusSortOrder.get(a.status_id ?? "") ?? 99) -
            (statusSortOrder.get(b.status_id ?? "") ?? 99),
        )
      : project.phases;

  const phases = sortedPhases.filter(
    (phase) => !hiddenPhaseStatuses.includes(phase.status_id ?? "none"),
  );

  const phaseLabelWidth = useUniformLabelWidth(phases.map((p) => p.name));
  const { totalWidth } = useTimelineDays();

  // 隣同士のsort_orderを入れ替えることで並び替える（表示中の並び順＝phases基準）。
  // status順表示中はPhase自体のsort_orderを動かしても見た目の並びが変わらず
  // 混乱を招くため、追加順表示（phaseSortMode==="manual"）のときだけ有効にする
  // （PhaseRow側にはundefinedを渡し、ボタンごと出さない）。
  const movePhase = (index: number, direction: -1 | 1) => {
    const current = phases[index];
    const target = phases[index + direction];
    if (!current || !target) {
      return;
    }
    updatePhase.mutate({ id: current.id, patch: { sort_order: target.sort_order } });
    updatePhase.mutate({ id: target.id, patch: { sort_order: current.sort_order } });
  };

  // ▲▼ボタンと同じく、追加順表示のときだけドラッグで並び替えられる
  // （ユーザー要望：「ドラッグでの入れ替えをしてもらえると助かる」）。
  const handlePhaseDragEnd = (event: DragEndEvent) => {
    if (phaseSortMode !== "manual") {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = phases.findIndex((p) => p.id === active.id);
    const newIndex = phases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const reordered = arrayMove(phases, oldIndex, newIndex);
    reorderPhases.mutate(reordered.map((p) => p.id));
  };

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhaseDragEnd}>
          <SortableContext items={phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div
              className="flex flex-col gap-1 py-1"
              style={{ width: SIDEBAR_WIDTH_PX + totalWidth }}
            >
              {phases.map((phase, index) => (
                <SortablePhaseRow
                  key={phase.id}
                  phase={phase}
                  depth={depth + 1}
                  labelWidth={phaseLabelWidth}
                  projectColor={project.color}
                  orderNumber={index + 1}
                  draggable={phaseSortMode === "manual"}
                  onMoveUp={
                    phaseSortMode === "manual" && index > 0 ? () => movePhase(index, -1) : undefined
                  }
                  onMoveDown={
                    phaseSortMode === "manual" && index < phases.length - 1
                      ? () => movePhase(index, 1)
                      : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
