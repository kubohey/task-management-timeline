"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { emptyDoc, fetchDailyNote, fetchDailyTasks } from "./api";

/**
 * デイリータスクノート（右サイドバー）の表示データをまとめて取得する。
 * - ノート本文（daily_notes）：日付+ユーザーで1件
 * - その日にカレンダー登録されたタスク（task_placements経由、Project > Phase階層）
 *
 * どちらもどのPhase/Projectの変更で内容が変わりうるため、関連テーブルすべてを
 * 無絞り込みで購読し、変更があれば取得し直す（usePhaseTableDataと同様の方針）。
 */
export function useDailyNoteData(date: string, enabled: boolean) {
  useRealtimeTable("daily_notes", ["dailyNote", date], undefined, enabled);
  useRealtimeTable("task_placements", ["dailyTasks", date], undefined, enabled);
  useRealtimeTable("table_cells", ["dailyTasks", date], undefined, enabled);
  useRealtimeTable("table_rows", ["dailyTasks", date], undefined, enabled);
  useRealtimeTable("phases", ["dailyTasks", date], undefined, enabled);
  useRealtimeTable("projects", ["dailyTasks", date], undefined, enabled);

  const noteQuery = useQuery({
    queryKey: ["dailyNote", date],
    queryFn: () => fetchDailyNote(date),
    enabled,
  });
  const tasksQuery = useQuery({
    queryKey: ["dailyTasks", date],
    queryFn: () => fetchDailyTasks(date),
    enabled,
  });

  return {
    noteContent: noteQuery.data?.content ?? emptyDoc(),
    projects: tasksQuery.data ?? [],
    isLoading: noteQuery.isLoading || tasksQuery.isLoading,
    isError: noteQuery.isError || tasksQuery.isError,
  };
}
