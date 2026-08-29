"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { cn } from "@/lib/utils";
import { MAX_COLUMN_WIDTH_PX, MIN_COLUMN_WIDTH_PX } from "./week-utils";
import { useDeleteRoadmapColumn, useUpdateRoadmapColumn } from "./use-roadmap-mutations";
import type { RoadmapColumnRecord } from "./types";

interface RoadmapColumnHeaderProps {
  column: RoadmapColumnRecord;
}

/**
 * ロードマップの列見出し。ラベルは独立編集可能（元のProject名は変わらない）。
 * 右端をドラッグして列幅を自由に変更できる（docs/spec.md §2.6）。
 */
export function RoadmapColumnHeader({ column }: RoadmapColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const updateColumn = useUpdateRoadmapColumn();
  const deleteColumn = useDeleteRoadmapColumn();

  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const widthRef = useRef(column.width);
  useEffect(() => {
    widthRef.current = column.width;
  }, [column.width]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const handleMove = (moveEvent: PointerEvent) => {
      const next = Math.min(
        MAX_COLUMN_WIDTH_PX,
        Math.max(MIN_COLUMN_WIDTH_PX, startWidth + (moveEvent.clientX - startX)),
      );
      setLiveWidth(next);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setLiveWidth((next) => {
        if (next !== null && next !== column.width) {
          updateColumn.mutate({ id: column.id, patch: { width: next } });
        }
        return null;
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      className="relative flex shrink-0 items-center gap-1 border-r bg-background px-2 py-1.5"
      style={{ width: liveWidth ?? column.width }}
    >
      <InlineEditableText
        value={column.label}
        editing={editing}
        onEditingChange={setEditing}
        onSubmit={(label) => updateColumn.mutate({ id: column.id, patch: { label } })}
        className="flex-1 text-sm font-semibold"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="ラベルを編集"
        onClick={() => setEditing(true)}
      >
        ✏️
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="列を削除"
        onClick={() => {
          if (confirm(`列「${column.label}」を削除しますか？（埋め込んだタスクもすべて削除されます）`)) {
            deleteColumn.mutate(column.id);
          }
        }}
      >
        <Trash2Icon />
      </Button>
      <div
        onPointerDown={startResize}
        title="ドラッグして列幅を変更"
        className={cn(
          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none",
          "hover:bg-border",
        )}
      />
    </div>
  );
}
