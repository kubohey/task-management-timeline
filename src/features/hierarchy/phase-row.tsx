"use client";

import { useState } from "react";
import { Maximize2Icon, TableIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { PhaseTableDialog } from "@/features/phase-table/phase-table-dialog";
import { PhaseTablePanel } from "@/features/phase-table/phase-table-panel";
import { CalendarRowCells } from "@/features/timeline/calendar-row-cells";
import { SIDEBAR_WIDTH_PX } from "@/features/timeline/constants";
import { INDENT_STEP_PX } from "./constants";
import { StatusSelect } from "./status-select";
import { useDeletePhase, useUpdatePhase } from "./use-hierarchy-mutations";
import type { PhaseRecord } from "./types";

interface PhaseRowProps {
  phase: PhaseRecord;
  depth: number;
  labelWidth: number;
}

/**
 * Phase行：名前編集、status付与、削除。
 * タスク表はカレンダーと並べて見えるインライン展開、または単体ダイアログの2通りで開ける。
 */
export function PhaseRow({ phase, depth, labelWidth }: PhaseRowProps) {
  const [editing, setEditing] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const updatePhase = useUpdatePhase();
  const deletePhase = useDeletePhase();

  return (
    <div>
      <div className="flex items-stretch">
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border border-transparent bg-background px-2 py-1.5 hover:border-border"
          style={{ width: SIDEBAR_WIDTH_PX, paddingLeft: depth * INDENT_STEP_PX + 8 }}
        >
          <InlineEditableText
            value={phase.name}
            editing={editing}
            onEditingChange={setEditing}
            onSubmit={(name) => updatePhase.mutate({ id: phase.id, patch: { name } })}
            className="font-medium"
            style={{ width: labelWidth }}
          />
          <StatusSelect
            status={phase.status}
            onChange={(status) => updatePhase.mutate({ id: phase.id, patch: { status } })}
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
              title={tableOpen ? "タスク表を閉じる（カレンダーと並べて表示）" : "タスク表を開く（カレンダーと並べて表示）"}
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
        <CalendarRowCells />
      </div>
      {tableOpen && (
        <div style={{ paddingLeft: depth * INDENT_STEP_PX + 8 }}>
          <PhaseTablePanel phaseId={phase.id} />
        </div>
      )}
      <PhaseTableDialog
        phaseId={phase.id}
        phaseName={phase.name}
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
      />
    </div>
  );
}
