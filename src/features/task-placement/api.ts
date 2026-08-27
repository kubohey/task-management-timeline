import { createClient } from "@/lib/supabase/client";
import type { TaskPlacementRecord } from "./types";

/**
 * 指定Phaseのタスク配置一覧を取得する。task_placementsはphase_idを持たないため、
 * table_rows経由の埋め込みフィルタで絞り込む。docs/spec.md §5
 */
export async function fetchTaskPlacements(phaseId: string): Promise<TaskPlacementRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_placements")
    .select("id, source_row_id, start_date, end_date, created_at, updated_at, table_rows!inner(phase_id)")
    .eq("table_rows.phase_id", phaseId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    source_row_id: row.source_row_id,
    start_date: row.start_date,
    end_date: row.end_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function insertTaskPlacement(input: {
  sourceRowId: string;
  date: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("task_placements").insert({
    source_row_id: input.sourceRowId,
    start_date: input.date,
    end_date: input.date,
  });
  if (error) throw error;
}

export async function deleteTaskPlacement(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("task_placements").delete().eq("id", id);
  if (error) throw error;
}

export type TaskPlacementPatch = Partial<Pick<TaskPlacementRecord, "start_date" | "end_date">>;

/** 予定の日付範囲を更新する（タイムライン上でのドラッグリサイズ用）。 */
export async function updateTaskPlacement(id: string, patch: TaskPlacementPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("task_placements").update(patch).eq("id", id);
  if (error) throw error;
}
