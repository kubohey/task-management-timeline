"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardCopyIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getDayTextColorClass, getWeekdayLabel } from "@/features/timeline/date-utils";
import { RichTextEditor } from "@/features/shared/rich-text-editor";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { docToMarkdown } from "./obsidian-export";
import { OUTSIDE_TAG } from "./types";
import { useDailyNoteData } from "./use-daily-note-data";
import { useSaveDailyNote, useSaveOutsideNote, useSetDailyNoteTags } from "./use-daily-note-mutations";

interface DailyNoteSidebarProps {
  userId: string;
  date: string;
}

/**
 * カレンダーの日付ヘッダーをクリックすると開く右サイドバー。
 * 1枚の自由記述ノート（Tiptap）で、初回に開いたときだけその日にカレンダー登録されている
 * タスクを「プロジェクト名 → Phase名 → タスク名」のチェックリストとして本文に挿入する
 * （雛形挿入はtask-list-doc.ts）。保存後はPhase表と独立した本文になり、ここでの編集
 * （チェック・文言変更・削除等）はPhase表側に反映されない（docs/spec.md §2.5）。
 * Obsidianへ`- [ ]`形式のままコピペできる。
 *
 * outsideトグルON時は、このプロジェクト用メモに加えてoutside専用メモ（daily_notes.
 * outside_content）が現れ、2つの自由記述欄が画面分割（上下）で並ぶ。形式・操作性は
 * どちらも同じRichTextEditorで、保存先の列が異なるだけの完全に独立したメモ。1件以上
 * 書かれた日は、カレンダーの日付ヘッダー上に折りたたみ可能な吹き出しでその内容を表示する
 * （outsideについて.png参照、timeline/outside-task-callouts.tsx）。
 */
export function DailyNoteSidebar({ userId, date }: DailyNoteSidebarProps) {
  const width = useUiStore((s) => s.dailyNoteWidth);
  const setWidth = useUiStore((s) => s.setDailyNoteWidth);
  const closeDailyNote = useUiStore((s) => s.closeDailyNote);

  const { content, tags, outsideContent, isLoading, isError } = useDailyNoteData(date, true);
  const saveNote = useSaveDailyNote();
  const saveOutsideNote = useSaveOutsideNote();
  const setTags = useSetDailyNoteTags();
  const isOutsideDay = tags.includes(OUTSIDE_TAG);

  const toggleOutsideDay = (checked: boolean) => {
    const nextTags = checked
      ? [...tags, OUTSIDE_TAG]
      : tags.filter((t) => t !== OUTSIDE_TAG);
    setTags.mutate({ userId, date, tags: nextTags });
  };

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
    const markdown = docToMarkdown(content);
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

        <div className="flex items-center justify-end gap-2 border-b px-3 py-1.5">
          <Label htmlFor="outside-day-toggle" className="text-xs text-muted-foreground">
            Outside project
          </Label>
          <Switch
            id="outside-day-toggle"
            size="sm"
            checked={isOutsideDay}
            disabled={isLoading}
            onCheckedChange={toggleOutsideDay}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">読み込み中...</p>
          ) : isError ? (
            <p className="p-3 text-sm text-destructive">データの取得に失敗しました。</p>
          ) : isOutsideDay ? (
            // outsideトグルON時は、プロジェクト用メモとoutside専用メモを画面分割（上下）で
            // 並べる。両者は完全に独立した自由記述欄（RichTextEditor）で、形式・操作性は同じ。
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-b p-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">プロジェクト</p>
                <RichTextEditor
                  toolbar
                  value={content}
                  onChange={(next) => saveNote.mutate({ userId, date, content: next })}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Outside</p>
                <RichTextEditor
                  toolbar
                  value={outsideContent}
                  onChange={(next) => saveOutsideNote.mutate({ userId, date, content: next })}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <RichTextEditor
                toolbar
                value={content}
                onChange={(next) => saveNote.mutate({ userId, date, content: next })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
