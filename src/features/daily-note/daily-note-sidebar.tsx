"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardCopyIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getDayTextColorClass, getWeekdayLabel } from "@/features/timeline/date-utils";
import { RichTextEditor } from "@/features/shared/rich-text-editor";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { buildDailyNoteMarkdown } from "./obsidian-export";
import { useDailyNoteData } from "./use-daily-note-data";
import { useSaveDailyNote, useToggleDailyTask } from "./use-daily-note-mutations";

interface DailyNoteSidebarProps {
  userId: string;
  date: string;
}

/**
 * カレンダーの日付ヘッダーをクリックすると開く右サイドバー。
 * その日にカレンダー登録されたタスクをProject > Phase > タスクの階層で自動表示しつつ、
 * 自由記述のメモ（チェックリスト等）も書ける1枚のノートになっている。
 * Obsidianへ`- [ ]`形式のままコピペできる（docs/spec.md §2.5）。
 */
export function DailyNoteSidebar({ userId, date }: DailyNoteSidebarProps) {
  const width = useUiStore((s) => s.dailyNoteWidth);
  const setWidth = useUiStore((s) => s.setDailyNoteWidth);
  const closeDailyNote = useUiStore((s) => s.closeDailyNote);

  const { noteContent, projects, isLoading, isError } = useDailyNoteData(date, true);
  const saveNote = useSaveDailyNote();
  const toggleTask = useToggleDailyTask();

  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const handleMove = (moveEvent: PointerEvent) => {
      // サイドバーは右端に固定されているため、ポインタを左へ動かすほど幅が広がる。
      setWidth(startWidth + (startX - moveEvent.clientX));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleCopy = async () => {
    const markdown = buildDailyNoteMarkdown(projects, noteContent);
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success("Obsidian用にコピーしました");
    } catch {
      toast.error("クリップボードへのコピーに失敗しました");
    }
  };

  const day = parseISO(date);

  return (
    <div className="relative flex h-full shrink-0 border-l bg-background" style={{ width }}>
      <div
        onPointerDown={startResize}
        title="ドラッグして幅を変更"
        className="absolute top-0 bottom-0 left-0 z-10 w-1.5 -translate-x-1/2 cursor-col-resize touch-none hover:bg-border active:bg-primary"
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className={cn("text-sm font-semibold", getDayTextColorClass(day))}>
            {format(day, "yyyy年M月d日")}（{getWeekdayLabel(day)}）
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              <ClipboardCopyIcon />
              Obsidianへコピー
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="閉じる"
              onClick={closeDailyNote}
            >
              <XIcon />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">データの取得に失敗しました。</p>
          ) : (
            <>
              <section>
                <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  この日のタスク
                </h3>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">登録されたタスクはありません。</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {projects.map((project) => (
                      <div key={project.projectId}>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          {project.projectColor && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: project.projectColor }}
                            />
                          )}
                          {project.projectName}
                        </div>
                        {project.phases.map((phase) => (
                          <div key={phase.phaseId} className="pl-3.5">
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              {phase.phaseName}
                            </div>
                            <div className="flex flex-col gap-0.5 pl-1">
                              {phase.tasks.map((task) => (
                                <label
                                  key={task.placementId}
                                  className="flex items-start gap-1.5 text-sm"
                                >
                                  <Checkbox
                                    className="mt-0.5"
                                    checked={task.checked}
                                    disabled={!task.checkboxColumnId}
                                    onCheckedChange={(checked) => {
                                      if (!task.checkboxColumnId) return;
                                      toggleTask.mutate({
                                        rowId: task.rowId,
                                        columnId: task.checkboxColumnId,
                                        checked: checked === true,
                                        date,
                                        phaseId: task.phaseId,
                                      });
                                    }}
                                  />
                                  <span
                                    className={cn(
                                      task.checked && "text-muted-foreground line-through",
                                    )}
                                  >
                                    {task.taskName}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-4 border-t pt-3">
                <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">メモ</h3>
                <RichTextEditor
                  toolbar
                  value={noteContent}
                  onChange={(content) => saveNote.mutate({ userId, date, content })}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
