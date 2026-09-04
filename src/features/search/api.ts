import { createClient } from "@/lib/supabase/client";
import type { TextCellValue } from "@/features/phase-table/types";

export interface SearchPlacementRow {
  id: string;
  source_row_id: string;
  start_date: string;
  end_date: string;
  phase_id: string;
}

/**
 * タスク検索用に、ユーザーが持つ全Phaseのタスク配置（カレンダー登録）を一括取得する。
 * use-task-placements.tsのfetchTaskPlacementsと違いPhase単位に絞り込まない
 * （検索は全Phase横断のため）。RLSにより自分のデータのみ取得される。
 */
export async function fetchAllTaskPlacementsForSearch(): Promise<SearchPlacementRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_placements")
    .select("id, source_row_id, start_date, end_date, table_rows!inner(phase_id)")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    source_row_id: row.source_row_id,
    start_date: row.start_date,
    end_date: row.end_date,
    phase_id: (row.table_rows as unknown as { phase_id: string }).phase_id,
  }));
}

export interface SearchTaskNameRow {
  row_id: string;
  taskName: string;
}

/**
 * タスク検索用に、全Phaseのタスク表から「タスク名」列（key === "task_name"）の
 * セル値だけを一括取得する。table_cellsはphase_id/列typeを持たないため、
 * table_columns側の絞り込みで対象列を特定する。
 */
export async function fetchAllTaskNames(): Promise<SearchTaskNameRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table_cells")
    .select("row_id, value, table_columns!inner(key)")
    .eq("table_columns.key", "task_name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    row_id: row.row_id,
    taskName: (row.value as TextCellValue).text ?? "",
  }));
}
