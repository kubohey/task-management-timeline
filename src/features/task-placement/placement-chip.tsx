"use client";

import { useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { XIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NoteRichCellValue, SubtaskListCellValue } from "@/features/phase-table/types";
import { cn } from "@/lib/utils";
import { CHIP_LANE_GAP_PX, CHIP_LANE_HEIGHT_PX } from "./lanes";
import { TaskMemoPopover } from "./task-memo-popover";
import type { TaskPlacementRecord } from "./types";
import { useDeletePlacement, useUpdatePlacement } from "./use-task-placement-mutations";

interface PlacementChipProps {
  placement: TaskPlacementRecord;
  phaseId: string;
  /** 表示中の月の日付一覧における開始日のインデックス。 */
  dayIndex: number;
  /** 1日あたりのセル幅（px）。表示スケールによって変わる（docs/spec.md §2.4）。 */
  dayWidth: number;
  /** 同じ日に他の予定と重なる場合の縦積み段番号（0始まり）。 */
  lane: number;
  /** このPhase行で使われているレーン数。1なら重なりなし＝従来どおり行いっぱいに表示。 */
  laneCount: number;
  label: string;
  /** このPhaseが属するProjectの色。未設定の場合は既定のプライマリカラーを使う。 */
  color: string | null;
  noteColumnId?: string;
  subtaskColumnId?: string;
  noteValue?: NoteRichCellValue;
  subtaskValue?: SubtaskListCellValue;
}

type ResizeHandle = "start" | "end";

/**
 * タイムライン上のタスクチップ。ホバーでツールチップ、クリックでメモ欄、
 * 左右端をドラッグして複数日の予定にリサイズできる（docs/spec.md、Phase 6
 * 「登録済みタスクをドラッグで複数日に引き伸ばす」）。
 */
export function PlacementChip({
  placement,
  phaseId,
  dayIndex,
  dayWidth,
  lane,
  laneCount,
  label,
  color,
  noteColumnId,
  subtaskColumnId,
  noteValue,
  subtaskValue,
}: PlacementChipProps) {
  const deletePlacement = useDeletePlacement();
  const updatePlacement = useUpdatePlacement();
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [resizeDeltaDays, setResizeDeltaDays] = useState(0);

  const committedSpanDays = Math.max(
    1,
    differenceInCalendarDays(parseISO(placement.end_date), parseISO(placement.start_date)) + 1,
  );

  // ドラッグ中は見た目のdayIndex/spanDaysだけをローカルにライブプレビューする。
  let previewDayIndex = dayIndex;
  let previewSpanDays = committedSpanDays;
  if (activeHandle === "start") {
    previewDayIndex = dayIndex + resizeDeltaDays;
    previewSpanDays = Math.max(1, committedSpanDays - resizeDeltaDays);
  } else if (activeHandle === "end") {
    previewSpanDays = Math.max(1, committedSpanDays + resizeDeltaDays);
  }

  const startResize = (handle: ResizeHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    setActiveHandle(handle);
    setResizeDeltaDays(0);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      setResizeDeltaDays(Math.round(deltaPx / dayWidth));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setActiveHandle(null);
      setResizeDeltaDays((delta) => {
        if (delta !== 0) {
          const start = parseISO(placement.start_date);
          const end = parseISO(placement.end_date);
          if (handle === "start") {
            const newStart = addDays(start, delta);
            updatePlacement.mutate({
              id: placement.id,
              phaseId,
              patch: { start_date: format(newStart > end ? end : newStart, "yyyy-MM-dd") },
            });
          } else {
            const newEnd = addDays(end, delta);
            updatePlacement.mutate({
              id: placement.id,
              phaseId,
              patch: { end_date: format(newEnd < start ? start : newEnd, "yyyy-MM-dd") },
            });
          }
        }
        return 0;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <Tooltip>
      <TaskMemoPopover
        rowId={placement.source_row_id}
        phaseId={phaseId}
        taskName={label}
        noteColumnId={noteColumnId}
        subtaskColumnId={subtaskColumnId}
        noteValue={noteValue}
        subtaskValue={subtaskValue}
      >
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group absolute flex items-center overflow-hidden rounded px-1.5 text-[11px]",
              // 重なりがない（laneCount===1）ときは従来どおり行いっぱいに表示。
              // 同じ日に複数タスクがある（laneCount>=2）ときは自分のレーン分だけの高さで縦積みする。
              laneCount <= 1 && "top-0.5 bottom-0.5",
              color ? "text-foreground" : "bg-primary text-primary-foreground",
            )}
            style={{
              left: previewDayIndex * dayWidth,
              width: previewSpanDays * dayWidth,
              backgroundColor: color ?? undefined,
              ...(laneCount > 1
                ? {
                    top: 2 + lane * (CHIP_LANE_HEIGHT_PX + CHIP_LANE_GAP_PX),
                    height: CHIP_LANE_HEIGHT_PX,
                  }
                : undefined),
            }}
          >
            <div
              className="absolute top-0 left-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10"
              onPointerDown={startResize("start")}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="flex-1 truncate">{label}</span>
            <button
              type="button"
              className="hidden shrink-0 rounded hover:bg-foreground/10 group-hover:block"
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Remove this timeline entry? The original task will remain.")) {
                  deletePlacement.mutate({ id: placement.id, phaseId });
                }
              }}
            >
              <XIcon className="size-3" />
            </button>
            <div
              className="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10"
              onPointerDown={startResize("end")}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </TooltipTrigger>
      </TaskMemoPopover>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
