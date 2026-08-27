"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useCreatePlacementWithNewRow } from "./use-task-placement-mutations";
import { useTaskPlacements } from "./use-task-placements";

interface PhaseTimelineCellsProps {
  phaseId: string;
  columns: TableColumnRecord[];
  rows: RowWithCells[];
  /** このPhaseが属するProjectの色。タスクチップの色をProjectに揃えるために使う。 */
  chipColor: string | null;
}

interface DayCellProps {
  id: string;
  date: Date;
  className: string;
  phaseId: string;
  columns: TableColumnRecord[];
  sortOrder: number;
}

/**
 * 日付背景セル。ドラッグ&ドロップの受け先であると同時に、クリックすると
 * その日にタスクを直接追加できる（表からドラッグする方向の逆）。
 * 追加すると表側にも新しい行として反映される（docs/spec.md §2.2の逆方向）。
 */
function DayCell({ id, date, className, phaseId, columns, sortOrder }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [open, setOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const createWithNewRow = useCreatePlacementWithNewRow();

  const submit = () => {
    const trimmed = taskName.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    createWithNewRow.mutate({
      phaseId,
      columns,
      taskName: trimmed,
      date: format(date, "yyyy-MM-dd"),
      sortOrder,
    });
    setTaskName("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTaskName("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          className={cn(
            "shrink-0 cursor-pointer border-r hover:bg-accent/50",
            className,
            isOver && "bg-primary/20",
          )}
          style={{ width: DAY_WIDTH_PX }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{format(date, "M月d日")}にタスクを追加</p>
          <Input
            autoFocus
            value={taskName}
            placeholder="タスク名"
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button type="button" size="sm" onClick={submit}>
            追加
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Phase行のタイムライン部分。日付背景セル（ドロップ先、`day:${phaseId}:${isoDate}`）の
 * 上に、登録済みタスクのチップ（`PlacementChip`）を重ねて表示する。
 * docs/spec.md §2.2・§2.3
 */
export function PhaseTimelineCells({ phaseId, columns, rows, chipColor }: PhaseTimelineCellsProps) {
  const { days, startIndex, endIndex, leadingWidth, trailingWidth } = useTimelineDays();
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
      {leadingWidth > 0 && <div className="shrink-0" style={{ width: leadingWidth }} />}
      {days.slice(startIndex, endIndex + 1).map((day) => (
        <DayCell
          key={day.toISOString()}
          id={`day:${phaseId}:${format(day, "yyyy-MM-dd")}`}
          date={day}
          className={getDayBgColorClass(day)}
          phaseId={phaseId}
          columns={columns}
          sortOrder={rows.length}
        />
      ))}
      {trailingWidth > 0 && <div className="shrink-0" style={{ width: trailingWidth }} />}
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
            color={chipColor}
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
