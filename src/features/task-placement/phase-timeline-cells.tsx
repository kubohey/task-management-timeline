"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isSameDay, parseISO } from "date-fns";
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
import { PlacementChip } from "./placement-chip";
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
 * 上に、登録済みタスクのチップ（`PlacementChip`）を重ねて表示する。
 * docs/spec.md §2.2・§2.3
 */
export function PhaseTimelineCells({ phaseId, columns, rows }: PhaseTimelineCellsProps) {
  const days = useTimelineDays();
  const { placements } = useTaskPlacements(phaseId);

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
        const dayIndex = days.findIndex((d) => isSameDay(d, start));
        if (dayIndex === -1) {
          return null;
        }
        const sourceRow = rowsById[placement.source_row_id];
        const label =
          (taskNameColumnId
            ? (sourceRow?.cells[taskNameColumnId] as TextCellValue | undefined)?.text
            : undefined) || "(無題のタスク)";

        return (
          <PlacementChip
            key={placement.id}
            placement={placement}
            phaseId={phaseId}
            dayIndex={dayIndex}
            label={label}
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
          />
        );
      })}
    </div>
  );
}
