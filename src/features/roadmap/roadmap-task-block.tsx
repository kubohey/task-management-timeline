"use client";

import { useState } from "react";
import { addWeeks, format, parseISO } from "date-fns";
import { MoveIcon, Trash2Icon } from "lucide-react";
import { ColorPicker } from "@/features/shared/color-picker";
import { cn } from "@/lib/utils";
import { useDeleteRoadmapTask, useUpdateRoadmapTask } from "./use-roadmap-mutations";
import { diffWeeks, WEEK_ROW_HEIGHT_PX } from "./week-utils";
import type { RoadmapTaskRecord } from "./types";

interface RoadmapTaskBlockProps {
  task: RoadmapTaskRecord;
  /** 表示中の週一覧における開始週のインデックス。 */
  startIndex: number;
  lane: number;
  laneCount: number;
  /** 埋め込み元Project/Phaseの現在の色（resolveRoadmapTaskColor参照）。 */
  color: string | null;
}

type DragHandle = "start" | "end" | "move";

/**
 * ロードマップの週セルに埋め込まれた1タスクブロック。
 * 上下端をドラッグして期間（週数）を伸縮でき（docs/spec.md §2.6）、左上の
 * 移動ハンドル（MoveIcon）をドラッグすると期間はそのまま別の週へ移動できる
 * （ユーザー要望：「セルをドラッグしてタスクを入れ替えられる機能」）。
 * テキストは直接編集できる（編集内容はPhase表・カレンダー側には反映されない独立コピー）。
 * PlacementChip（メインのガントチャート、日単位・横方向）と同じ考え方の縦方向版。
 */
export function RoadmapTaskBlock({ task, startIndex, lane, laneCount, color }: RoadmapTaskBlockProps) {
  const updateTask = useUpdateRoadmapTask();
  const deleteTask = useDeleteRoadmapTask();
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);
  const [deltaWeeks, setDeltaWeeks] = useState(0);

  const committedSpanWeeks = Math.max(
    1,
    diffWeeks(parseISO(task.end_week), parseISO(task.start_week)) + 1,
  );

  let previewStartIndex = startIndex;
  let previewSpanWeeks = committedSpanWeeks;
  if (activeHandle === "start") {
    previewStartIndex = startIndex + deltaWeeks;
    previewSpanWeeks = Math.max(1, committedSpanWeeks - deltaWeeks);
  } else if (activeHandle === "end") {
    previewSpanWeeks = Math.max(1, committedSpanWeeks + deltaWeeks);
  } else if (activeHandle === "move") {
    previewStartIndex = startIndex + deltaWeeks;
  }

  const startDrag = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    setActiveHandle(handle);
    setDeltaWeeks(0);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      setDeltaWeeks(Math.round(deltaPx / WEEK_ROW_HEIGHT_PX));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setActiveHandle(null);
      setDeltaWeeks((delta) => {
        if (delta !== 0) {
          const start = parseISO(task.start_week);
          const end = parseISO(task.end_week);
          if (handle === "start") {
            const newStart = addWeeks(start, delta);
            updateTask.mutate({
              id: task.id,
              patch: { start_week: format(newStart > end ? end : newStart, "yyyy-MM-dd") },
            });
          } else if (handle === "end") {
            const newEnd = addWeeks(end, delta);
            updateTask.mutate({
              id: task.id,
              patch: { end_week: format(newEnd < start ? start : newEnd, "yyyy-MM-dd") },
            });
          } else {
            // move：期間（週数）はそのまま、開始・終了を同じ週数だけまとめてずらす。
            updateTask.mutate({
              id: task.id,
              patch: {
                start_week: format(addWeeks(start, delta), "yyyy-MM-dd"),
                end_week: format(addWeeks(end, delta), "yyyy-MM-dd"),
              },
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
    <div
      className={cn(
        "group absolute overflow-hidden rounded border border-black/10",
        color ? "text-foreground" : "bg-primary text-primary-foreground",
      )}
      style={{
        top: previewStartIndex * WEEK_ROW_HEIGHT_PX + 1,
        height: previewSpanWeeks * WEEK_ROW_HEIGHT_PX - 2,
        left: `${(lane / laneCount) * 100}%`,
        width: `${(1 / laneCount) * 100}%`,
        backgroundColor: color ?? undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 z-10 h-1.5 w-full cursor-ns-resize opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10"
        onPointerDown={startDrag("start")}
      />
      {/* hidden/group-hover:flex（displayの出し入れ）ではなく、常時displayさせて
          opacityだけで見せ隠しする。ColorPickerのPopoverはポータル表示され
          group（このブロック）の外にDOM上存在するため、displayで消してしまうと
          ポインタがポップオーバーへ移動した瞬間にトリガーごと消えて再表示が
          繰り返され、位置計算が暴れて開けなくなる（ユーザー報告の表示ブレ）。 */}
      <div className="absolute top-0.5 left-0.5 z-10 flex opacity-0 group-hover:opacity-100">
        <button
          type="button"
          className="cursor-grab touch-none rounded bg-background/70 p-1 hover:bg-background active:cursor-grabbing"
          title="ドラッグして移動"
          onPointerDown={startDrag("move")}
        >
          <MoveIcon className="size-3" />
        </button>
      </div>
      <div className="absolute top-0.5 right-0.5 z-10 flex items-center gap-0.5 rounded bg-background/70 opacity-0 group-hover:opacity-100">
        {task.source_type === "manual" && (
          <ColorPicker
            color={task.color}
            onChange={(nextColor) => updateTask.mutate({ id: task.id, patch: { color: nextColor } })}
          />
        )}
        <button
          type="button"
          className="rounded p-1 hover:bg-background"
          title="削除"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("このタスクブロックを削除しますか？")) {
              deleteTask.mutate(task.id);
            }
          }}
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
      <textarea
        key={task.label}
        defaultValue={task.label}
        className="h-full w-full resize-none overflow-y-auto border-none bg-transparent p-1.5 pr-5 text-xs outline-none"
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next !== task.label && next.trim()) {
            updateTask.mutate({ id: task.id, patch: { label: next } });
          }
        }}
      />
      <div
        className="absolute bottom-0 left-0 z-10 h-1.5 w-full cursor-ns-resize opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10"
        onPointerDown={startDrag("end")}
      />
    </div>
  );
}
