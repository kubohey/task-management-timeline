"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3Icon, GripVerticalIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/features/shared/inline-editable-text";
import { cn } from "@/lib/utils";
import { MAX_COLUMN_WIDTH_PX, MIN_COLUMN_WIDTH_PX } from "./week-utils";
import {
  useDeleteRoadmapColumn,
  useDeleteRoadmapTask,
  useUpdateRoadmapColumn,
  useUpdateRoadmapTask,
} from "./use-roadmap-mutations";
import type { RoadmapColumnRecord, RoadmapTaskRecord } from "./types";

interface RoadmapColumnHeaderProps {
  column: RoadmapColumnRecord;
  /** この列に属するタスク一覧。サブ列を削除するとき、そのサブ列にタスクが残っていないか確認するために使う。 */
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
 * サブ列が2つ以上あるときは、見出し下にサブ列ごとの帯を出し、削除したい
 * サブ列を個別に指定して削除できる（ユーザー要望：「削除したい列を指定できる
 * ようにしたい」。それまでは末尾のサブ列しか削除できなかった）。
 * 見出し左端のつまみをドラッグして列（Project）全体を左右に並び替えられる
 * （ユーザー要望：「各プロジェクトの列をドラッグして、並び替えられるように
 * してほしい」）。実際のドラッグ処理・sort_order確定はRoadmapView側で行う
 * （このコンポーネントは`@dnd-kit/sortable`のuseSortableに乗るだけ）。
 */
export function RoadmapColumnHeader({ column, tasks, width, onLiveWidthChange }: RoadmapColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const updateColumn = useUpdateRoadmapColumn();
  const updateTask = useUpdateRoadmapTask();
  const deleteTask = useDeleteRoadmapTask();
  const deleteColumn = useDeleteRoadmapColumn();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  // 指定したサブ列（laneIndex）を削除する。そこにタスクが残っている場合は確認の
  // うえタスクごと削除し、それより後ろのサブ列は詰めて（lane番号を1つずつ前へ）、
  // 列全体のlane_countを1減らす。
  const removeSubColumn = (laneIndex: number) => {
    if (column.lane_count <= 1) {
      return;
    }
    const affected = tasks.filter((task) => task.lane === laneIndex);
    if (affected.length > 0) {
      const ok = confirm(
        `このサブ列にはタスクが${affected.length}件あります。削除すると、それらのタスクも削除されます。よろしいですか？`,
      );
      if (!ok) {
        return;
      }
      for (const task of affected) {
        deleteTask.mutate(task.id);
      }
    }
    for (const task of tasks) {
      if (task.lane > laneIndex) {
        updateTask.mutate({ id: task.id, patch: { lane: task.lane - 1 } });
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
      ref={setNodeRef}
      className="relative flex shrink-0 flex-col border-r bg-background"
      style={{
        width,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.6 : undefined,
      }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          title="ドラッグして列を並び替え"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
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
          title="列を削除"
          onClick={() => {
            if (confirm(`列「${column.label}」を削除しますか？（埋め込んだタスクもすべて削除されます）`)) {
              deleteColumn.mutate(column.id);
            }
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
      {/* サブ列が2つ以上あるときだけ、サブ列ごとの帯を出し個別に削除できるようにする。
          1つしかないときは列見出しの「列を削除」で列ごと消せば十分なので出さない。 */}
      {column.lane_count > 1 && (
        <div className="flex border-t">
          {Array.from({ length: column.lane_count }, (_, lane) => (
            <div
              key={lane}
              className="flex shrink-0 items-center justify-between border-r px-1.5 py-0.5 text-[10px] text-muted-foreground last:border-r-0"
              style={{ width: width / column.lane_count }}
            >
              <span>列{lane + 1}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                title={`列${lane + 1}を削除`}
                onClick={() => removeSubColumn(lane)}
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
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
