"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { emptyDoc, fetchDailyNote, fetchDailyTasks } from "./api";
import { buildDailyTaskListDoc } from "./task-list-doc";

/**
 * デイリータスクノート（右サイドバー）の本文を取得する。
 * - 既にノートが保存されている（daily_notesに行がある）：その本文をそのまま返す
 * - まだ一度も保存されていない：その日にカレンダー登録されているタスクから
 *   雛形（プロジェクト名 → Phase名 → タスクのチェックリスト）を組み立てて初期値にする
 *   （タスク取得はこの雛形挿入のためだけに行うため、ノートが既にある場合は取得しない）
 *
 * 一度保存された後は、タスク側（Phase表）が変わってもこの本文を上書き・再同期しない
 * （docs/spec.md §2.5「デイリーノート内の編集はPhase表と連動しない」）。
 */
export function useDailyNoteData(date: string, enabled: boolean) {
  useRealtimeTable("daily_notes", ["dailyNote", date], undefined, enabled);

  const noteQuery = useQuery({
    queryKey: ["dailyNote", date],
    queryFn: () => fetchDailyNote(date),
    enabled,
  });

  const needsSeed = enabled && noteQuery.isSuccess && noteQuery.data === null;
  const tasksQuery = useQuery({
    queryKey: ["dailyTasks", date],
    queryFn: () => fetchDailyTasks(date),
    enabled: needsSeed,
  });

  const content = noteQuery.data
    ? noteQuery.data.content
    : tasksQuery.data
      ? buildDailyTaskListDoc(tasksQuery.data)
      : emptyDoc();

  return {
    content,
    isLoading: noteQuery.isLoading || (needsSeed && tasksQuery.isLoading),
    isError: noteQuery.isError || tasksQuery.isError,
  };
}
