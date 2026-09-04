"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOutsideContentNotes } from "@/features/daily-note/api";
import { toPreviewLines } from "@/features/daily-note/task-list-doc";
import { fetchGroups, fetchPhases, fetchProjects } from "@/features/hierarchy/api";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchAllTaskNames, fetchAllTaskPlacementsForSearch } from "./api";

export interface TaskSearchMatch {
  kind: "task";
  placementId: string;
  sourceRowId: string;
  startDate: string;
  endDate: string;
  taskName: string;
  phaseId: string;
  phaseName: string;
  projectId: string;
  projectColor: string | null;
  /** パンくず表示用（例：「Group / Subgroup / Project」）。 */
  groupPath: string;
  /** ジャンプ時に折りたたみを解除する祖先Group（Subgroupも含む）のid一覧。 */
  ancestorGroupIds: string[];
}

export interface OutsideNoteMatch {
  kind: "outside";
  date: string;
  /** 一致した行（複数一致した場合は先頭の1行）。結果一覧のプレビュー表示用。 */
  snippet: string;
}

export type TaskSearchResult = TaskSearchMatch | OutsideNoteMatch;

/**
 * カレンダーに登録済みのタスク（task_placements）とoutside専用メモ（daily_notes.
 * outside_content、プロジェクト外の予定欄）を、それぞれの本文テキストで横断検索する。
 * groups/projects/phases・outsideメモはhierarchy/daily-note側の各フックと同じqueryKeyで
 * キャッシュを共有し、二重取得を避ける。task_placements/table_cellsは検索専用にPhase横断で
 * 一括取得する（通常の表示は常にPhase単位のためこのキャッシュは別）。
 * ユーザー要望：「カレンダーに登録しているタスクの検索機能がほしい」
 * 「outsideに入力したタスクも検索できるようにして。今はプロジェクトしか検索できない」
 */
export function useTaskSearch(query: string) {
  useRealtimeTable("task_placements", ["searchTaskPlacements"]);
  useRealtimeTable("table_cells", ["searchTaskNames"]);
  useRealtimeTable("daily_notes", ["outsideContentNotes"]);

  const placementsQuery = useQuery({
    queryKey: ["searchTaskPlacements"],
    queryFn: fetchAllTaskPlacementsForSearch,
  });
  const taskNamesQuery = useQuery({
    queryKey: ["searchTaskNames"],
    queryFn: fetchAllTaskNames,
  });
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const phasesQuery = useQuery({ queryKey: ["phases"], queryFn: fetchPhases });
  const outsideNotesQuery = useQuery({
    queryKey: ["outsideContentNotes"],
    queryFn: fetchOutsideContentNotes,
  });

  const isLoading =
    placementsQuery.isLoading ||
    taskNamesQuery.isLoading ||
    groupsQuery.isLoading ||
    projectsQuery.isLoading ||
    phasesQuery.isLoading ||
    outsideNotesQuery.isLoading;

  const results = useMemo<TaskSearchResult[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }
    const lower = trimmed.toLowerCase();

    const taskNameByRowId = new Map(
      (taskNamesQuery.data ?? []).map((t) => [t.row_id, t.taskName]),
    );
    const phaseById = new Map((phasesQuery.data ?? []).map((p) => [p.id, p]));
    const projectById = new Map((projectsQuery.data ?? []).map((p) => [p.id, p]));
    const groupById = new Map((groupsQuery.data ?? []).map((g) => [g.id, g]));

    const out: TaskSearchResult[] = [];
    for (const placement of placementsQuery.data ?? []) {
      const taskName = taskNameByRowId.get(placement.source_row_id) ?? "";
      if (!taskName.toLowerCase().includes(lower)) {
        continue;
      }
      const phase = phaseById.get(placement.phase_id);
      const project = phase ? projectById.get(phase.project_id) : undefined;
      if (!phase || !project) {
        continue;
      }

      // 祖先Group（Subgroup→親Groupの順）を遡って、パンくずと折りたたみ解除対象を集める。
      const ancestorGroupIds: string[] = [];
      const pathParts: string[] = [];
      let currentGroupId: string | null = project.group_id;
      while (currentGroupId) {
        const group = groupById.get(currentGroupId);
        if (!group) break;
        ancestorGroupIds.push(group.id);
        pathParts.unshift(group.name);
        currentGroupId = group.parent_group_id;
      }
      pathParts.push(project.name);

      out.push({
        kind: "task",
        placementId: placement.id,
        sourceRowId: placement.source_row_id,
        startDate: placement.start_date,
        endDate: placement.end_date,
        taskName: taskName || "(無題のタスク)",
        phaseId: phase.id,
        phaseName: phase.name,
        projectId: project.id,
        projectColor: project.color,
        groupPath: pathParts.join(" / "),
        ancestorGroupIds,
      });
    }

    for (const note of outsideNotesQuery.data ?? []) {
      const lines = toPreviewLines(note.content);
      const matchedLine = lines.find((line) => line.text.toLowerCase().includes(lower));
      if (!matchedLine) {
        continue;
      }
      out.push({ kind: "outside", date: note.date, snippet: matchedLine.text });
    }

    out.sort((a, b) => {
      const dateA = a.kind === "task" ? a.startDate : a.date;
      const dateB = b.kind === "task" ? b.startDate : b.date;
      return dateA.localeCompare(dateB);
    });
    return out;
  }, [
    query,
    placementsQuery.data,
    taskNamesQuery.data,
    groupsQuery.data,
    projectsQuery.data,
    phasesQuery.data,
    outsideNotesQuery.data,
  ]);

  return {
    results,
    isLoading,
    // ジャンプ時（折りたたみ解除の判定）に呼び出し側でも使うため、取得済みのキャッシュをそのまま返す。
    groups: groupsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    phases: phasesQuery.data ?? [],
  };
}
