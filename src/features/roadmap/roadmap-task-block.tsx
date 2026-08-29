"use client";

import { useState } from "react";
import { addWeeks, format, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, MoveIcon, Trash2Icon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/features/shared/color-picker";
import { useUiStore } from "@/store/ui-store";
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
  /** ドラッグ移動の確定（週数の差分）。複数選択中なら選択分すべてまとめて移動するかはRoadmapView側が判定する。 */
  onMoveCommit: (deltaWeeks: number) => void;
  /** 並列表示（同じ週範囲で重なるブロック）の左右入れ替え。隣に入れ替え先が無いときはundefined＝ボタン非表示。 */
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

type ResizeHandle = "start" | "end";

/**
 * ロードマップの週セルに埋め込まれた1タスクブロック。
 * - 上下端をドラッグして期間（週数）を伸縮できる（docs/spec.md §2.6）
 * - 右上（削除ボタンの下）の移動ハンドル（MoveIcon）をドラッグすると、期間は
 *   そのまま別の週へ移動できる（ユーザー要望：「セルをドラッグしてタスクを
 *   入れ替えられる機能」。当初は左上に置いていたが文字に被るため右上へ移動）
 * - 左上のチェックボックスで複数選択でき、選択中のブロックのどれかをドラッグ
 *   すると選択中のブロックすべてを同じ週数だけまとめて移動する
 *   （ユーザー要望：「複数選択して同時にセルのドラッグができると嬉しい」）
 * - 並列表示（同じ週範囲で重なるブロック）は下端の◀▶で左右を入れ替えられる
 *   （ユーザー要望：「並列に置いたタスクを左右に入れ替えられない？」）
 * テキストは直接編集できる（編集内容はPhase表・カレンダー側には反映されない独立コピー）。
 * PlacementChip（メインのガントチャート、日単位・横方向）と同じ考え方の縦方向版。
 */
export function RoadmapTaskBlock({
  task,
  startIndex,
  lane,
  laneCount,
  color,
  onMoveCommit,
  onMoveLeft,
  onMoveRight,
}: RoadmapTaskBlockProps) {
  const updateTask = useUpdateRoadmapTask();
  const deleteTask = useDeleteRoadmapTask();
  const selectedIds = useUiStore((s) => s.selectedRoadmapTaskIds);
  const toggleSelected = useUiStore((s) => s.toggleSelectedRoadmapTask);
  const isSelected = selectedIds.includes(task.id);

  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [resizeDeltaWeeks, setResizeDeltaWeeks] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [moveDeltaWeeks, setMoveDeltaWeeks] = useState(0);

  const committedSpanWeeks = Math.max(
    1,
    diffWeeks(parseISO(task.end_week), parseISO(task.start_week)) + 1,
  );

  let previewStartIndex = startIndex;
  let previewSpanWeeks = committedSpanWeeks;
  if (activeHandle === "start") {
    previewStartIndex = startIndex + resizeDeltaWeeks;
    previewSpanWeeks = Math.max(1, committedSpanWeeks - resizeDeltaWeeks);
  } else if (activeHandle === "end") {
    previewSpanWeeks = Math.max(1, committedSpanWeeks + resizeDeltaWeeks);
  } else if (isMoving) {
    previewStartIndex = startIndex + moveDeltaWeeks;
  }

  const startResize = (handle: ResizeHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    setActiveHandle(handle);
    setResizeDeltaWeeks(0);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      setResizeDeltaWeeks(Math.round(deltaPx / WEEK_ROW_HEIGHT_PX));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setActiveHandle(null);
      setResizeDeltaWeeks((delta) => {
        if (delta !== 0) {
          const start = parseISO(task.start_week);
          const end = parseISO(task.end_week);
          if (handle === "start") {
            const newStart = addWeeks(start, delta);
            updateTask.mutate({
              id: task.id,
              patch: { start_week: format(newStart > end ? end : newStart, "yyyy-MM-dd") },
            });
          } else {
            const newEnd = addWeeks(end, delta);
            updateTask.mutate({
              id: task.id,
              patch: { end_week: format(newEnd < start ? start : newEnd, "yyyy-MM-dd") },
            });
          }
        }
        return 0;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const startMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    setIsMoving(true);
    setMoveDeltaWeeks(0);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientY - startY;
      setMoveDeltaWeeks(Math.round(deltaPx / WEEK_ROW_HEIGHT_PX));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setIsMoving(false);
      setMoveDeltaWeeks((delta) => {
        onMoveCommit(delta);
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
        isSelected && "ring-2 ring-offset-1 ring-ring",
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
        onPointerDown={startResize("start")}
      />
      {/* 複数選択用チェックボックス。ドラッグで選択中のブロックをまとめて移動できる
          （ユーザー要望：「複数選択して同時にセルのドラッグができると嬉しい」）。
          選択中は常時表示、未選択時はホバーで表示する。 */}
      <div
        className={cn(
          "absolute top-0.5 left-0.5 z-10 rounded bg-background/70 p-0.5",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleSelected(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          title="複数選択（選択中のブロックはまとめてドラッグ移動できる）"
        />
      </div>
      {/* hidden/group-hover:flex（displayの出し入れ）ではなく、常時displayさせて
          opacityだけで見せ隠しする。ColorPickerのPopoverはポータル表示され
          group（このブロック）の外にDOM上存在するため、displayで消してしまうと
          ポインタがポップオーバーへ移動した瞬間にトリガーごと消えて再表示が
          繰り返され、位置計算が暴れて開けなくなる（ユーザー報告の表示ブレ）。
          移動ハンドルは文字（テキストエリア）に被らないよう、削除ボタンの
          真下に縦に並べて右上隅にまとめる。 */}
      <div className="absolute top-0.5 right-0.5 z-10 flex flex-col items-end gap-0.5 opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-0.5 rounded bg-background/70">
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
        <button
          type="button"
          className="cursor-grab touch-none rounded bg-background/70 p-1 hover:bg-background active:cursor-grabbing"
          title="ドラッグして移動（複数選択中はまとめて移動）"
          onPointerDown={startMove}
        >
          <MoveIcon className="size-3" />
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
      {(onMoveLeft || onMoveRight) && (
        <div className="absolute bottom-0.5 left-0.5 z-10 flex w-[calc(100%-4px)] justify-between opacity-0 group-hover:opacity-100">
          <button
            type="button"
            className="rounded bg-background/70 p-0.5 disabled:invisible hover:bg-background"
            disabled={!onMoveLeft}
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="左のブロックと入れ替え"
          >
            <ChevronLeftIcon className="size-3" />
          </button>
          <button
            type="button"
            className="rounded bg-background/70 p-0.5 disabled:invisible hover:bg-background"
            disabled={!onMoveRight}
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="右のブロックと入れ替え"
          >
            <ChevronRightIcon className="size-3" />
          </button>
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 z-10 h-1.5 w-full cursor-ns-resize opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10"
        onPointerDown={startResize("end")}
      />
    </div>
  );
}
