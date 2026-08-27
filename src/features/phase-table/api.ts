import { createClient } from "@/lib/supabase/client";
import type { ParsedObsidianRow } from "./obsidian-import";
import { defaultCellValue } from "./types";
import type { CellValue, TableColumnRecord, TableRowRecord } from "./types";

// ============================================================
// 取得
// ============================================================

export async function fetchTableColumns(phaseId: string): Promise<TableColumnRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table_columns")
    .select("*")
    .eq("phase_id", phaseId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTableRows(phaseId: string): Promise<TableRowRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table_rows")
    .select("*")
    .eq("phase_id", phaseId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTableCells(
  rowIds: string[],
): Promise<{ row_id: string; column_id: string; value: CellValue }[]> {
  if (rowIds.length === 0) {
    return [];
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table_cells")
    .select("row_id, column_id, value")
    .in("row_id", rowIds);
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// 列編集
// ============================================================

export type TableColumnPatch = Partial<Pick<TableColumnRecord, "width" | "label">>;

export async function updateTableColumn(id: string, patch: TableColumnPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("table_columns").update(patch).eq("id", id);
  if (error) throw error;
}

// ============================================================
// 行の追加・削除
// ============================================================

/** 行を1件追加し、各列の初期値で空セルをまとめて作成する。 */
export async function insertTableRow(input: {
  phaseId: string;
  columns: TableColumnRecord[];
  sortOrder: number;
}) {
  const supabase = createClient();
  const { data: row, error: rowError } = await supabase
    .from("table_rows")
    .insert({ phase_id: input.phaseId, sort_order: input.sortOrder })
    .select("id")
    .single();
  if (rowError) throw rowError;

  const cells = input.columns.map((column) => ({
    row_id: row.id as string,
    column_id: column.id,
    value: defaultCellValue(column.type),
  }));
  const { error: cellsError } = await supabase.from("table_cells").insert(cells);
  if (cellsError) throw cellsError;
}

export async function deleteTableRow(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("table_rows").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// セル編集
// ============================================================

export async function upsertTableCell(input: {
  rowId: string;
  columnId: string;
  value: CellValue;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("table_cells")
    .upsert(
      { row_id: input.rowId, column_id: input.columnId, value: input.value },
      { onConflict: "row_id,column_id" },
    );
  if (error) throw error;
}

// ============================================================
// Obsidian貼り付けインポート
// ============================================================

/** パース済みのObsidian表を、既存行の末尾に追記する。 */
export async function importObsidianRows(input: {
  phaseId: string;
  columns: TableColumnRecord[];
  parsedRows: ParsedObsidianRow[];
  baseSortOrder: number;
}) {
  const { phaseId, columns, parsedRows, baseSortOrder } = input;
  if (parsedRows.length === 0) {
    return;
  }

  const checkboxColumn = columns.find((c) => c.type === "checkbox");
  const textColumns = columns.filter((c) => c.type === "text" || c.type === "note_rich");
  const [taskNameColumn, noteColumn] = textColumns;
  const subtaskColumn = columns.find((c) => c.type === "subtask_list");

  const supabase = createClient();
  const { data: rows, error: rowsError } = await supabase
    .from("table_rows")
    .insert(
      parsedRows.map((_, index) => ({
        phase_id: phaseId,
        sort_order: baseSortOrder + index,
      })),
    )
    .select("id");
  if (rowsError) throw rowsError;
  if (!rows) return;

  const cells: { row_id: string; column_id: string; value: CellValue }[] = [];
  parsedRows.forEach((parsed, index) => {
    const rowId = rows[index].id as string;
    if (checkboxColumn) {
      cells.push({ row_id: rowId, column_id: checkboxColumn.id, value: { checked: parsed.checked } });
    }
    if (taskNameColumn) {
      cells.push({ row_id: rowId, column_id: taskNameColumn.id, value: { text: parsed.taskName } });
    }
    if (noteColumn) {
      cells.push({ row_id: rowId, column_id: noteColumn.id, value: { text: parsed.note } });
    }
    if (subtaskColumn) {
      cells.push({
        row_id: rowId,
        column_id: subtaskColumn.id,
        value: { items: parsed.subtasks },
      });
    }
  });

  const { error: cellsError } = await supabase.from("table_cells").insert(cells);
  if (cellsError) throw cellsError;
}
