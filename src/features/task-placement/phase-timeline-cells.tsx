"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { differenceInCalendarDays, format, isSameDay, parseISO } from "date-fns";
import { XIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  NoteRichCellValue,
  RowWithCells,
  SubtaskListCellValue,
  TableColumnRecord,
  TextCellValue,
} from "@/features/phase-table/types";
import { DAY_WIDTH_PX } from "@/features/timeline/constants";
import { getDayBgColorClass } from "@/features/timeline/date-utils";
import { useTimelineDays } from "@/features/timeline/timeline-context";
import { cn } from "@/lib/utils";
import { TaskMemoPopover } from "./task-memo-popover";
import { useDeletePlacement } from "./use-task-placement-mutations";
import { useTaskPlacements } from "./use-task-placements";

interface PhaseTimelineCellsProps {
  phaseId: string;
  columns: TableColumnRecord[];
  rows: RowWithCells[];
}

function DroppableDayCell({ id, className }: { id: string; className: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn("shrink-0 border-r", className, isOver && "bg-primary/20")}
      style={{ width: DAY_WIDTH_PX }}
    />
  );
}

/**
 * Phase行のタイムライン部分。日付背景セル（ドロップ先、`day:${phaseId}:${isoDate}`）の
 * 上に、登録済みタスクのチップを重ねて表示する。ホバーでタスク名全文をツールチップ表示、
 * クリックでメモ欄（備考・サブタスク）を開く、ホバー時のみ現れる×ボタンで登録を削除できる
 * （元のPhase表の行は消えない）。docs/spec.md §2.2・§2.3
 */
export function PhaseTimelineCells({ phaseId, columns, rows }: PhaseTimelineCellsProps) {
  const days = useTimelineDays();
  const { placements } = useTaskPlacements(phaseId);
  const deletePlacement = useDeletePlacement();

  const taskNameColumnId = columns.find((c) => c.key === "task_name")?.id;
  const noteColumnId = columns.find((c) => c.key === "note")?.id;
  const subtaskColumnId = columns.find((c) => c.key === "subtasks")?.id;
  const rowsById = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.row.id, r])),
    [rows],
  );

  return (
    <div className="relative flex">
      {days.map((day) => (
        <DroppableDayCell
          key={day.toISOString()}
          id={`day:${phaseId}:${format(day, "yyyy-MM-dd")}`}
          className={getDayBgColorClass(day)}
        />
      ))}
      {placements.map((placement) => {
        const start = parseISO(placement.start_date);
        const end = parseISO(placement.end_date);
        const dayIndex = days.findIndex((d) => isSameDay(d, start));
        if (dayIndex === -1) {
          return null;
        }
        const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
        const sourceRow = rowsById[placement.source_row_id];
        const label =
          (taskNameColumnId
            ? (sourceRow?.cells[taskNameColumnId] as TextCellValue | undefined)?.text
            : undefined) || "(無題のタスク)";

        return (
          <Tooltip key={placement.id}>
            <TaskMemoPopover
              rowId={placement.source_row_id}
              phaseId={phaseId}
              taskName={label}
              noteColumnId={noteColumnId}
              subtaskColumnId={subtaskColumnId}
              noteValue={
                noteColumnId
                  ? (sourceRow?.cells[noteColumnId] as NoteRichCellValue | undefined)
                  : undefined
              }
              subtaskValue={
                subtaskColumnId
                  ? (sourceRow?.cells[subtaskColumnId] as SubtaskListCellValue | undefined)
                  : undefined
              }
            >
              <TooltipTrigger asChild>
                <div
                  className="group absolute top-0.5 bottom-0.5 flex items-center gap-0.5 overflow-hidden rounded bg-primary px-1 text-[11px] text-primary-foreground"
                  style={{ left: dayIndex * DAY_WIDTH_PX, width: spanDays * DAY_WIDTH_PX }}
                >
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    className="hidden shrink-0 rounded hover:bg-primary-foreground/20 group-hover:block"
                    title="登録を削除"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("このタイムライン登録を削除しますか？（元のタスクは残ります）")) {
                        deletePlacement.mutate({ id: placement.id, phaseId });
                      }
                    }}
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              </TooltipTrigger>
            </TaskMemoPopover>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
