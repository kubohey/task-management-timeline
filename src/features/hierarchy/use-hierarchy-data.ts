"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchGroups, fetchPhaseStatuses, fetchPhases, fetchProjects } from "./api";

/**
 * 階層構造（groups/projects/phases）とPhaseのstatus定義一覧（phase_statuses）を
 * まとめて取得し、Realtime購読で他デバイスからの変更を反映する。
 * RLSにより自分のデータのみ取得される。
 */
export function useHierarchyData() {
  useRealtimeTable("groups", ["groups"]);
  useRealtimeTable("projects", ["projects"]);
  useRealtimeTable("phases", ["phases"]);
  useRealtimeTable("phase_statuses", ["phase_statuses"]);

  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const phasesQuery = useQuery({ queryKey: ["phases"], queryFn: fetchPhases });
  const phaseStatusesQuery = useQuery({
    queryKey: ["phase_statuses"],
    queryFn: fetchPhaseStatuses,
  });

  // どのクエリが失敗したか・実際のエラー内容を画面側で表示できるよう、
  // 個別のエラーもまとめて返す（原因調査用。docs/spec.md参照なし、デバッグ目的）。
  const errors = [
    groupsQuery.error && { label: "groups", error: groupsQuery.error },
    projectsQuery.error && { label: "projects", error: projectsQuery.error },
    phasesQuery.error && { label: "phases", error: phasesQuery.error },
    phaseStatusesQuery.error && { label: "phase_statuses", error: phaseStatusesQuery.error },
  ].filter((e): e is { label: string; error: Error } => Boolean(e));

  return {
    groups: groupsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    phases: phasesQuery.data ?? [],
    phaseStatuses: phaseStatusesQuery.data ?? [],
    isLoading:
      groupsQuery.isLoading ||
      projectsQuery.isLoading ||
      phasesQuery.isLoading ||
      phaseStatusesQuery.isLoading,
    isError:
      groupsQuery.isError ||
      projectsQuery.isError ||
      phasesQuery.isError ||
      phaseStatusesQuery.isError,
    errors,
  };
}
