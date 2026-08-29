import { createClient } from "@/lib/supabase/client";
import type { ParsedObsidianRow } from "./obsidian-import";
import { defaultCellValue, emptyDoc } from "./types";
import type { CellValue, TableColumnRecord, TableColumnType, TableRowRecord } from "./types";

/** 列typeごとの初期幅（px）。create_default_table_columns()トリガーの値と揃える。 */
const DEFAULT_COLUMN_WIDTH: Record<TableColumnType, number> = {
  checkbox: 48,
  text: 240,
  note_rich: 320,
  subtask_list: 240,
};

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

/**
 * 列を1件追加し、既存の全行に対して初期値のセルをまとめて作成する。
 * keyはユーザー入力に紐づく意味を持たないため一意な値を生成する。
 */
export async function createTableColumn(input: {
  phaseId: string;
  label: string;
  type: TableColumnType;
  sortOrder: number;
  existingRowIds: string[];
}) {
  const supabase = createClient();
  const { data: column, error: columnError } = await supabase
    .from("table_columns")
    .insert({
      phase_id: input.phaseId,
      key: `custom_${crypto.randomUUID()}`,
      label: input.label,
      type: input.type,
      width: DEFAULT_COLUMN_WIDTH[input.type],
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (columnError) throw columnError;

  if (input.existingRowIds.length === 0) {
    return;
  }
  const cells = input.existingRowIds.map((rowId) => ({
    row_id: rowId,
    column_id: column.id as string,
    value: defaultCellValue(input.type),
  }));
  const { error: cellsError } = await supabase.from("table_cells").insert(cells);
  if (cellsError) throw cellsError;
}

/** ユーザーが追加した列を削除する（デフォルト4列は呼び出し側でUIから除外する）。 */
export async function deleteTableColumn(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("table_columns").delete().eq("id", id);
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

/**
 * 行をドラッグで並び替えた後、新しい並び順どおりにsort_orderを振り直す。
 * 行数分の個別updateを並列実行する（1テーブルあたりの行数は多くない想定のため）。
 */
export async function reorderTableRows(input: { orderedRowIds: string[] }) {
  const supabase = createClient();
  const results = await Promise.all(
    input.orderedRowIds.map((id, index) =>
      supabase.from("table_rows").update({ sort_order: index }).eq("id", id),
    ),
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw firstError;
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
      const noteValue: CellValue =
        noteColumn.type === "note_rich"
          ? {
              doc: parsed.note
                ? { ...emptyDoc(), content: [{ type: "paragraph", content: [{ type: "text", text: parsed.note }] }] }
                : emptyDoc(),
            }
          : { text: parsed.note };
      cells.push({ row_id: rowId, column_id: noteColumn.id, value: noteValue });
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
