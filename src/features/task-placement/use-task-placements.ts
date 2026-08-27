"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchTaskPlacements } from "./api";

/**
 * Phaseのタスク配置（タイムライン上のチップ）を取得する。タイムライン表示は常に
 * 見えている必要があるため、テーブル表示の開閉に関わらず常時有効。
 * task_placementsはphase_idを持たないため、Realtime購読は無絞り込みで行う。
 */
export function useTaskPlacements(phaseId: string) {
  useRealtimeTable("task_placements", ["taskPlacements", phaseId]);

  const query = useQuery({
    queryKey: ["taskPlacements", phaseId],
    queryFn: () => fetchTaskPlacements(phaseId),
  });

  return {
    placements: query.data ?? [],
    isLoading: query.isLoading,
  };
}
