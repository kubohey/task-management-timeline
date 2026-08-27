"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { SubtaskListCell } from "@/features/phase-table/cells/subtask-list-cell";
import { useUpdateCell } from "@/features/phase-table/use-phase-table-mutations";
import { emptyDoc } from "@/features/phase-table/types";
import type { NoteRichCellValue, SubtaskListCellValue } from "@/features/phase-table/types";
import { RichTextEditor } from "@/features/shared/rich-text-editor";

interface TaskMemoPopoverProps {
  rowId: string;
  phaseId: string;
  taskName: string;
  noteColumnId?: string;
  subtaskColumnId?: string;
  noteValue: NoteRichCellValue | undefined;
  subtaskValue: SubtaskListCellValue | undefined;
  children: ReactNode;
}

/**
 * タイムライン上のタスク（チップ）をクリックすると開くメモ欄。
 * 備考（フル操作のリッチテキスト）とサブタスクを表示・編集する。
 * 編集はPhase表と同じtable_cellsを更新するため、実体を複製せず双方向同期が成立する。
 * docs/spec.md §2.3
 */
export function TaskMemoPopover({
  rowId,
  phaseId,
  taskName,
  noteColumnId,
  subtaskColumnId,
  noteValue,
  subtaskValue,
  children,
}: TaskMemoPopoverProps) {
  const updateCell = useUpdateCell();

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="max-h-[70vh] w-96 overflow-y-auto" align="start">
        <PopoverTitle>{taskName || "(無題のタスク)"}</PopoverTitle>
        {noteColumnId && (
          <div className="mt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">備考</p>
            <RichTextEditor
              toolbar
              value={noteValue?.doc ?? emptyDoc()}
              onChange={(doc) =>
                updateCell.mutate({ rowId, columnId: noteColumnId, value: { doc }, phaseId })
              }
            />
          </div>
        )}
        {subtaskColumnId && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">サブタスク</p>
            <SubtaskListCell
              value={subtaskValue}
              onChange={(value) =>
                updateCell.mutate({ rowId, columnId: subtaskColumnId, value, phaseId })
              }
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
