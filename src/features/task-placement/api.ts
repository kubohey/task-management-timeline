import { createClient } from "@/lib/supabase/client";
import { defaultCellValue } from "@/features/phase-table/types";
import type { TableColumnRecord } from "@/features/phase-table/types";
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

/**
 * タイムライン上での手動追加（表からのドラッグの逆方向）。Phase表に新しい行を1件作成し、
 * タスク名セルに入力値を入れ、その行を参照する予定をクリックした日付に登録する。
 * 表の行への参照のみで実体は複製しないため、Phase表側にもそのまま表示される
 * （docs/spec.md §2.2の「行→カレンダー」の逆方向）。
 */
export async function createPlacementWithNewRow(input: {
  phaseId: string;
  columns: TableColumnRecord[];
  taskName: string;
  date: string;
  sortOrder: number;
}) {
  const supabase = createClient();
  const { data: row, error: rowError } = await supabase
    .from("table_rows")
    .insert({ phase_id: input.phaseId, sort_order: input.sortOrder })
    .select("id")
    .single();
  if (rowError) throw rowError;

  const taskNameColumn = input.columns.find((c) => c.key === "task_name");
  const cells = input.columns.map((column) => ({
    row_id: row.id as string,
    column_id: column.id,
    value: column.id === taskNameColumn?.id ? { text: input.taskName } : defaultCellValue(column.type),
  }));
  const { error: cellsError } = await supabase.from("table_cells").insert(cells);
  if (cellsError) throw cellsError;

  const { error: placementError } = await supabase.from("task_placements").insert({
    source_row_id: row.id,
    start_date: input.date,
    end_date: input.date,
  });
  if (placementError) throw placementError;
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
