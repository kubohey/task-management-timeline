"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchGroups, fetchPhases, fetchProjects } from "./api";

/**
 * 階層構造（groups/projects/phases）をまとめて取得し、Realtime購読で
 * 他デバイスからの変更を反映する。RLSにより自分のデータのみ取得される。
 */
export function useHierarchyData() {
  useRealtimeTable("groups", ["groups"]);
  useRealtimeTable("projects", ["projects"]);
  useRealtimeTable("phases", ["phases"]);

  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const phasesQuery = useQuery({ queryKey: ["phases"], queryFn: fetchPhases });

  return {
    groups: groupsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    phases: phasesQuery.data ?? [],
    isLoading:
      groupsQuery.isLoading || projectsQuery.isLoading || phasesQuery.isLoading,
    isError: groupsQuery.isError || projectsQuery.isError || phasesQuery.isError,
  };
}
