"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableRowHandleProps {
  rowId: string;
  taskName: string;
}

/**
 * Phase内タスク表の行をタイムラインへドラッグ登録するためのつまみ。
 * ドラッグデータにrowIdとtaskName（DragOverlay表示・登録処理用）を積む。
 * docs/spec.md §2.2「表の行をドラッグ＆ドロップでカレンダーに登録できる」
 */
export function DraggableRowHandle({ rowId, taskName }: DraggableRowHandleProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `row:${rowId}`,
    data: { rowId, taskName },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      title="Drag to add to the timeline"
      {...listeners}
      {...attributes}
    >
      <GripVerticalIcon className="size-3.5" />
    </button>
  );
}
