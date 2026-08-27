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
import type { GroupNode } from "./build-tree";
import { INDENT_STEP_PX } from "./constants";
import { ProjectRow } from "./project-row";
import {
  useCreateGroup,
  useCreateProject,
  useDeleteGroup,
  useUpdateGroup,
} from "./use-hierarchy-mutations";

interface GroupRowProps {
  group: GroupNode;
  depth: number;
  labelWidth: number;
  userId: string;
  /** Subgroupをこれ以上ネストしない（Group直下のみ許可）ためのフラグ。 */
  allowSubgroup: boolean;
}

/** Group/Subgroup行：名前編集、色編集、Subgroup/Project追加、折りたたみ、削除。 */
export function GroupRow({ group, depth, labelWidth, userId, allowSubgroup }: GroupRowProps) {
  const [editing, setEditing] = useState(false);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const createGroup = useCreateGroup();
  const createProject = useCreateProject();

  const hasChildren = group.subgroups.length > 0 || group.projects.length > 0;
  const subgroupLabelWidth = useUniformLabelWidth(
    group.subgroups.map((g) => g.name),
    { className: "font-semibold" },
  );
  const projectLabelWidth = useUniformLabelWidth(group.projects.map((p) => p.name));

  return (
    <div>
      <div className="flex items-stretch">
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 px-2 py-1.5"
          style={{
            width: SIDEBAR_WIDTH_PX,
            paddingLeft: depth * INDENT_STEP_PX + 8,
            backgroundColor: group.color ?? "var(--color-background)",
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!hasChildren}
            onClick={() =>
              updateGroup.mutate({ id: group.id, patch: { is_collapsed: !group.is_collapsed } })
            }
            title="配下の折りたたみ"
          >
            {group.is_collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          </Button>
          <InlineEditableText
            value={group.name}
            editing={editing}
            onEditingChange={setEditing}
            onSubmit={(name) => updateGroup.mutate({ id: group.id, patch: { name } })}
            className="font-semibold"
            style={{ width: labelWidth }}
          />
          {allowSubgroup && (
            <InlineCreateButton
              label="Subgroup"
              onCreate={(name) =>
                createGroup.mutate({
                  userId,
                  name,
                  parentGroupId: group.id,
                  sortOrder: group.subgroups.length,
                })
              }
            />
          )}
          <InlineCreateButton
            label="Project"
            onCreate={(name) =>
              createProject.mutate({ groupId: group.id, name, sortOrder: group.projects.length })
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
              color={group.color}
              onChange={(color) => updateGroup.mutate({ id: group.id, patch: { color } })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="削除"
              onClick={() => {
                if (confirm(`「${group.name}」を削除しますか？（配下も全て削除されます）`)) {
                  deleteGroup.mutate(group.id);
                }
              }}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
        <CalendarRowCells />
      </div>
      {!group.is_collapsed && hasChildren && (
        <div className="flex flex-col gap-1 py-1">
          {group.subgroups.map((subgroup) => (
            <GroupRow
              key={subgroup.id}
              group={subgroup}
              depth={depth + 1}
              labelWidth={subgroupLabelWidth}
              userId={userId}
              allowSubgroup={false}
            />
          ))}
          {group.projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              depth={depth + 1}
              labelWidth={projectLabelWidth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
