"use client";

import { useQuery } from "@tanstack/react-query";
import { useHierarchyData } from "@/features/hierarchy/use-hierarchy-data";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchRoadmapColumns, fetchRoadmapTasks } from "./api";

/**
 * ロードマップ画面の表示データをまとめて取得する。
 * 列を作るときのProject選択・タスクを埋め込むときのProject/Phase選択・
 * タスクブロックの背景色（埋め込み元の色に連動）に既存の階層データが必要なため、
 * useHierarchyData（メインのガントチャート画面と同じフック）もあわせて呼び出す。
 */
export function useRoadmapData() {
  useRealtimeTable("roadmap_columns", ["roadmapColumns"]);
  useRealtimeTable("roadmap_tasks", ["roadmapTasks"]);

  const columnsQuery = useQuery({ queryKey: ["roadmapColumns"], queryFn: fetchRoadmapColumns });
  const tasksQuery = useQuery({ queryKey: ["roadmapTasks"], queryFn: fetchRoadmapTasks });
  const { projects, phases, isLoading: hierarchyLoading, isError: hierarchyError } = useHierarchyData();

  return {
    columns: columnsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    projects,
    phases,
    isLoading: columnsQuery.isLoading || tasksQuery.isLoading || hierarchyLoading,
    isError: columnsQuery.isError || tasksQuery.isError || hierarchyError,
  };
}
