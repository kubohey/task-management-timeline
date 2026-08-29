"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ColorPicker, TAB_COLOR_PRESETS } from "@/features/shared/color-picker";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { usePhaseStatuses } from "./phase-statuses-context";
import {
  useCreatePhaseStatus,
  useDeletePhaseStatus,
  useUpdatePhaseStatus,
} from "./use-hierarchy-mutations";

interface PhaseStatusManagerProps {
  userId: string;
}

/**
 * Phaseに付与できるstatus（名前・色）をユーザーが自由に追加・編集・削除・並び替えできる管理ダイアログ。
 * これまでのactive/always/next固定3値から、任意の数だけ扱えるように変更した
 * （docs/spec.md §2.1「status機能」、Phase7以降のユーザー要望）。
 */
export function PhaseStatusManager({ userId }: PhaseStatusManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const statuses = usePhaseStatuses();
  const createStatus = useCreatePhaseStatus();
  const updateStatus = useUpdatePhaseStatus();
  const deleteStatus = useDeletePhaseStatus();

  const addStatus = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    const nextColor = TAB_COLOR_PRESETS[statuses.length % TAB_COLOR_PRESETS.length];
    createStatus.mutate({ userId, name: trimmed, color: nextColor, sortOrder: statuses.length });
    setNewName("");
  };

  // 隣同士のsort_orderを入れ替えることで並び替える。
  const move = (index: number, direction: -1 | 1) => {
    const current = statuses[index];
    const target = statuses[index + direction];
    if (!current || !target) {
      return;
    }
    updateStatus.mutate({ id: current.id, patch: { sort_order: target.sort_order } });
    updateStatus.mutate({ id: target.id, patch: { sort_order: current.sort_order } });
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <SettingsIcon />
        Manage statuses
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage phase statuses</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            {statuses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No statuses yet. Add one below.
              </p>
            )}
            {statuses.map((status, index) => (
              <div key={status.id} className="flex items-center gap-1">
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="h-4"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    title="Move up"
                  >
                    <ArrowUpIcon className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="h-4"
                    disabled={index === statuses.length - 1}
                    onClick={() => move(index, 1)}
                    title="Move down"
                  >
                    <ArrowDownIcon className="size-3" />
                  </Button>
                </div>
                <ColorPicker
                  color={status.color}
                  onChange={(color) =>
                    updateStatus.mutate({
                      id: status.id,
                      patch: { color: color ?? TAB_COLOR_PRESETS[0] },
                    })
                  }
                />
                <InlineEditableText
                  value={status.name}
                  editing={editingId === status.id}
                  onEditingChange={(editing) => setEditingId(editing ? status.id : null)}
                  onSubmit={(name) => updateStatus.mutate({ id: status.id, patch: { name } })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditingId(status.id)}
                  title="Edit name"
                >
                  ✏️
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Delete"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete status "${status.name}"? Phases with this status will revert to unset.`,
                      )
                    ) {
                      deleteStatus.mutate(status.id);
                    }
                  }}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t pt-3">
            <Input
              value={newName}
              placeholder="New status name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStatus();
                }
              }}
              className="h-8"
            />
            <Button type="button" size="sm" onClick={addStatus}>
              <PlusIcon />
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
