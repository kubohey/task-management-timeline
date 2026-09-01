"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSetOutsideTasks } from "./use-daily-note-mutations";
import type { OutsideTaskItem } from "./types";

interface OutsideTaskListProps {
  userId: string;
  date: string;
  tasks: OutsideTaskItem[];
  disabled: boolean;
}

/**
 * 「outside」トグルON時にだけ表示される、プロジェクト外の予定（旅行の持ち物など）用の
 * 専用タスク欄。ノート本文（Tiptap、自由記述）とは別にdaily_notes.outside_tasksへ保存する。
 * ここに追加した項目は、カレンダーの日付ヘッダー上の吹き出し（outside-task-callouts.tsx）
 * にそのまま表示される。項目の追加/チェック/削除の形式はPhase表のサブタスク欄
 * （subtask-list-cell.tsx）と同じ考え方（チェックボックス付きリスト＋末尾の追加欄）。
 */
export function OutsideTaskList({ userId, date, tasks, disabled }: OutsideTaskListProps) {
  const [newText, setNewText] = useState("");
  const setOutsideTasks = useSetOutsideTasks();

  const save = (next: OutsideTaskItem[]) => setOutsideTasks.mutate({ userId, date, tasks: next });

  const addTask = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    save([...tasks, { id: crypto.randomUUID(), text: trimmed, checked: false }]);
    setNewText("");
  };

  const toggleTask = (id: string, checked: boolean) => {
    save(tasks.map((t) => (t.id === id ? { ...t, checked } : t)));
  };

  const removeTask = (id: string) => {
    save(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-1.5 border-b bg-muted/30 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">Outsideタスク</p>
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-1.5">
          <Checkbox
            checked={task.checked}
            disabled={disabled}
            onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
          />
          <span
            className={cn(
              "flex-1 truncate text-sm",
              task.checked && "text-muted-foreground line-through",
            )}
          >
            {task.text}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => removeTask(task.id)}
            title="削除"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <Input
          value={newText}
          disabled={disabled}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="タスクを追加"
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              addTask();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={addTask}
          title="追加"
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
