export type TableColumnType = "checkbox" | "text" | "note_rich" | "subtask_list";

export interface TableColumnRecord {
  id: string;
  phase_id: string;
  key: string;
  label: string;
  type: TableColumnType;
  width: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TableRowRecord {
  id: string;
  phase_id: string;
  sort_order: number;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export interface TableCellRecord {
  row_id: string;
  column_id: string;
  value: CellValue;
  updated_at: string;
}

export interface CheckboxCellValue {
  checked: boolean;
}

export interface TextCellValue {
  text: string;
}

export interface SubtaskItem {
  label: string;
  checked: boolean;
}

export interface SubtaskListCellValue {
  items: SubtaskItem[];
}

/**
 * table_cells.value（jsonb）の形。列のtypeによって形が決まる。
 * note_richはPhase 5（Tiptap）まではtextと同じ形で扱う。
 */
export type CellValue = CheckboxCellValue | TextCellValue | SubtaskListCellValue;

/**
 * UI表示用に、1行分のセルを列idでまとめたもの。
 * 列追加直後などでセルが未作成の場合もあるため、値はoptional。
 */
export interface RowWithCells {
  row: TableRowRecord;
  cells: Partial<Record<string, CellValue>>;
}

/** 列typeに対応するセルの初期値。行作成時・不足セルの補完に使う。 */
export function defaultCellValue(type: TableColumnType): CellValue {
  switch (type) {
    case "checkbox":
      return { checked: false };
    case "subtask_list":
      return { items: [] };
    case "text":
    case "note_rich":
      return { text: "" };
  }
}
