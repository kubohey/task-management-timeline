"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { emptyDoc, fetchDailyNote, fetchDailyTasks } from "./api";
import { buildDailyTaskListDoc, isBlankDoc } from "./task-list-doc";

/**
 * デイリータスクノート（右サイドバー）の本文を取得する。
 * - 既にノートが保存されていて、かつ中身が空でない：その本文をそのまま返す
 * - まだ一度も保存されていない、または保存されていても中身が空
 *   （RichTextEditorはフォーカスが外れるたび自動保存するため、何も書かないまま
 *   空のノートだけ作成されていることがある）：その日にカレンダー登録されている
 *   タスクから雛形（プロジェクト名 → Phase名 → タスクのチェックリスト）を
 *   組み立てて初期値にする（タスク取得はこの雛形挿入のためだけに行う）
 *
 * 一度、空でない内容が保存された後は、タスク側（Phase表）が変わってもこの本文を
 * 上書き・再同期しない（docs/spec.md §2.5「デイリーノート内の編集はPhase表と連動しない」）。
 */
export function useDailyNoteData(date: string, enabled: boolean) {
  useRealtimeTable("daily_notes", ["dailyNote", date], undefined, enabled);

  const noteQuery = useQuery({
    queryKey: ["dailyNote", date],
    queryFn: () => fetchDailyNote(date),
    enabled,
  });

  const savedContent = noteQuery.data?.content;
  const hasSavedContent = savedContent !== undefined && !isBlankDoc(savedContent);
  const needsSeed = enabled && noteQuery.isSuccess && !hasSavedContent;
  const tasksQuery = useQuery({
    queryKey: ["dailyTasks", date],
    queryFn: () => fetchDailyTasks(date),
    enabled: needsSeed,
  });

  const content = hasSavedContent
    ? savedContent
    : tasksQuery.data
      ? buildDailyTaskListDoc(tasksQuery.data)
      : emptyDoc();

  return {
    content,
    isLoading: noteQuery.isLoading || (needsSeed && tasksQuery.isLoading),
    isError: noteQuery.isError || tasksQuery.isError,
  };
}
