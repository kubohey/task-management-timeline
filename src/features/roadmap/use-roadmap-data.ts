"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildHierarchyTree, flattenProjectsInHierarchyOrder } from "@/features/hierarchy/build-tree";
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
  const {
    groups,
    projects,
    phases,
    isLoading: hierarchyLoading,
    isError: hierarchyError,
  } = useHierarchyData();

  // 列追加・週セルのProject/Phaseピッカー（検索候補）が、サイドバーと同じ
  // Group→Subgroup→Project→Phaseの階層順に並ぶよう並べ替える（ユーザー報告：
  // 「検索候補がランダム表示になっている」）。projectsテーブル単体のsort_orderは
  // Groupをまたいだ並びまでは表さない（親ごとにローカルな値）ため、階層木を
  // 一度組み立ててから展開する。
  const projectsInHierarchyOrder = useMemo(
    () => flattenProjectsInHierarchyOrder(buildHierarchyTree(groups, projects, phases)),
    [groups, projects, phases],
  );

  return {
    columns: columnsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    projects: projectsInHierarchyOrder,
    phases,
    isLoading: columnsQuery.isLoading || tasksQuery.isLoading || hierarchyLoading,
    isError: columnsQuery.isError || tasksQuery.isError || hierarchyError,
  };
}
