"use client";

import { useMemo, useState } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
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
import { getDayBgColorClass } from "@/features/timeline/date-utils";
import { useTimelineDays } from "@/features/timeline/timeline-context";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { assignLanes, CHIP_LANE_GAP_PX, CHIP_LANE_HEIGHT_PX } from "./lanes";
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
  dayWidth: number;
}

/**
 * 日付背景セル。ドラッグ&ドロップの受け先であると同時に、クリックすると
 * その日にタスクを直接追加できる（表からドラッグする方向の逆）。
 * 追加すると表側にも新しい行として反映される（docs/spec.md §2.2の逆方向）。
 */
function DayCell({ id, date, className, phaseId, columns, sortOrder, dayWidth }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  // ドラッグ中はネイティブの:hoverハイライト（灰色）を止め、dnd-kitのisOver
  // ハイライト（プライマリ色）だけを表示する。両方が同時に効くと、実際の
  // カーソル位置に追従する:hoverと、収集判定が確定してから1テンポ遅れて
  // 切り替わるisOverとで対象セルが一瞬ズレ、隣接する2セルが同時に光って
  // ちらつく（ユーザー報告：「灰色の点灯と、黒の点灯が二重でブレる」）。
  const { active } = useDndContext();
  const isAnyDragActive = active != null;
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
            "shrink-0 cursor-pointer border-r",
            !isAnyDragActive && "hover:bg-accent/50",
            className,
            isOver && "bg-primary/20",
          )}
          style={{ width: dayWidth }}
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
  const { days, startIndex, endIndex, leadingWidth, trailingWidth, dayWidth, outsideDates } =
    useTimelineDays();
  const { placements } = useTaskPlacements(phaseId);
  // タスク検索でジャンプした直後のタスクチップを一時ハイライトする（task-search-bar.tsx参照）。
  const highlightedPlacementId = useUiStore((s) => s.highlightedPlacementId);

  const taskNameColumnId = columns.find((c) => c.key === "task_name")?.id;
  const noteColumnId = columns.find((c) => c.key === "note")?.id;
  const subtaskColumnId = columns.find((c) => c.key === "subtasks")?.id;
  const rowsById = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.row.id, r])),
    [rows],
  );
  // 同じ日に複数タスクが登録された場合に縦積みで表示するためのレーン割り当て
  // （docs/spec.md §2.2・§2.3、1日1タスクの制約を撤廃）。
  const { laneById, laneCount } = useMemo(() => assignLanes(placements), [placements]);
  // 1レーンのみ（重複なし）のときは従来どおり行いっぱいにチップを表示する。
  // 2レーン以上のときだけ行の高さをレーン数に合わせて広げる。
  const minHeight =
    laneCount > 1 ? laneCount * CHIP_LANE_HEIGHT_PX + (laneCount - 1) * CHIP_LANE_GAP_PX + 4 : undefined;

  return (
    <div className="relative flex" style={minHeight ? { minHeight } : undefined}>
      {leadingWidth > 0 && <div className="shrink-0" style={{ width: leadingWidth }} />}
      {days.slice(startIndex, endIndex + 1).map((day) => (
        <DayCell
          key={day.toISOString()}
          id={`day:${phaseId}:${format(day, "yyyy-MM-dd")}`}
          date={day}
          className={getDayBgColorClass(day, outsideDates.has(format(day, "yyyy-MM-dd")))}
          phaseId={phaseId}
          columns={columns}
          sortOrder={rows.length}
          dayWidth={dayWidth}
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
            dayWidth={dayWidth}
            lane={laneById[placement.id] ?? 0}
            laneCount={laneCount}
            label={label}
            color={chipColor}
            highlighted={placement.id === highlightedPlacementId}
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
