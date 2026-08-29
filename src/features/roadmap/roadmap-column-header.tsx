"use client";

import { useRef, useState } from "react";
import { Columns2Icon, Columns3Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { cn } from "@/lib/utils";
import { MAX_COLUMN_WIDTH_PX, MIN_COLUMN_WIDTH_PX } from "./week-utils";
import { useDeleteRoadmapColumn, useUpdateRoadmapColumn, useUpdateRoadmapTask } from "./use-roadmap-mutations";
import type { RoadmapColumnRecord, RoadmapTaskRecord } from "./types";

interface RoadmapColumnHeaderProps {
  column: RoadmapColumnRecord;
  /** この列に属するタスク一覧。サブ列削除時、削除するサブ列にタスクが残っていないか確認するために使う。 */
  tasks: RoadmapTaskRecord[];
  /**
   * 表示に使う実効幅。ドラッグ中はRoadmapView側が管理するライブ値、そうでなければ
   * column.widthそのもの。RoadmapColumnStrip（その下の週セル・タスク列）も同じ値を
   * 見ているため、ドラッグ中も見出しと下のセルが常に同じ幅で追随する
   * （ユーザー要望：「Excelみたいに、ラベルの幅を変えるのと同時に下のセルも
   * 移動するようにして」）。
   */
  width: number;
  /** ドラッグ中に呼ばれ、RoadmapView側の共有ライブ幅を更新する。ドラッグ終了時はnullで解除する。 */
  onLiveWidthChange: (width: number | null) => void;
}

/**
 * ロードマップの列見出し。ラベルは独立編集可能（元のProject名は変わらない）。
 * 右端をドラッグして列幅を自由に変更できる（docs/spec.md §2.6）。
 */
export function RoadmapColumnHeader({ column, tasks, width, onLiveWidthChange }: RoadmapColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const updateColumn = useUpdateRoadmapColumn();
  const updateTask = useUpdateRoadmapTask();
  const deleteColumn = useDeleteRoadmapColumn();

  // サブ列を1つ減らす（末尾のサブ列を削除）。そこにタスクが残っている場合は、
  // 削除前に確認のうえ1つ左のサブ列へ移動してから減らす（ユーザー要望：
  // 「ロードマップで追加した列について、不要になった列の削除をできるようにしてほしい」
  // ＝列内の「＋」で増やしたサブ列側の話）。
  const removeSubColumn = () => {
    if (column.lane_count <= 1) {
      return;
    }
    const lastLane = column.lane_count - 1;
    const affected = tasks.filter((task) => task.lane === lastLane);
    if (affected.length > 0) {
      const ok = confirm(
        `最後のサブ列にはタスクが${affected.length}件あります。削除すると1つ左のサブ列へ移動します。よろしいですか？`,
      );
      if (!ok) {
        return;
      }
      for (const task of affected) {
        updateTask.mutate({ id: task.id, patch: { lane: lastLane - 1 } });
      }
    }
    updateColumn.mutate({ id: column.id, patch: { lane_count: column.lane_count - 1 } });
  };
  // ドラッグ終了時の確定に使う最新値。onLiveWidthChangeは親のstateを更新するだけで、
  // pointerupのハンドラは開始時点のクロージャのままなので、親からの新しいwidth
  // propを見に行けず古い値のままになりうる。確定処理は常にこのrefの最新値を使う。
  const liveWidthRef = useRef(width);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    liveWidthRef.current = startWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const next = Math.min(
        MAX_COLUMN_WIDTH_PX,
        Math.max(MIN_COLUMN_WIDTH_PX, startWidth + (moveEvent.clientX - startX)),
      );
      liveWidthRef.current = next;
      onLiveWidthChange(next);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onLiveWidthChange(null);
      if (liveWidthRef.current !== column.width) {
        updateColumn.mutate({ id: column.id, patch: { width: liveWidthRef.current } });
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      className="relative flex shrink-0 items-center gap-1 border-r bg-background px-2 py-1.5"
      style={{ width }}
    >
      <InlineEditableText
        value={column.label}
        editing={editing}
        onEditingChange={setEditing}
        onSubmit={(label) => updateColumn.mutate({ id: column.id, patch: { label } })}
        className="flex-1 text-center text-sm font-semibold"
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
        title="サブ列を追加（列内にもう1列増やす）"
        onClick={() =>
          updateColumn.mutate({ id: column.id, patch: { lane_count: column.lane_count + 1 } })
        }
      >
        <Columns3Icon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="サブ列を削除（末尾の1列を減らす）"
        disabled={column.lane_count <= 1}
        onClick={removeSubColumn}
      >
        <Columns2Icon />
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
