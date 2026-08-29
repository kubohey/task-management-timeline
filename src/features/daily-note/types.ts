import type { JSONContent } from "@tiptap/react";

/** daily_notesテーブル1件（ユーザー×日付で一意）。本文はTiptapのdoc構造。 */
export interface DailyNoteRecord {
  id: string;
  user_id: string;
  date: string;
  content: JSONContent;
  created_at: string;
  updated_at: string;
}

/** その日にカレンダー登録された1タスク（Phase表の行への参照）。 */
export interface DailyTaskItem {
  placementId: string;
  rowId: string;
  phaseId: string;
  /** Phase表のチェックボックス列（1列目）のセルID。チェック操作は表側のセルを直接更新する。 */
  checkboxColumnId: string | undefined;
  /** Phase表のチェックボックス列（1列目）の値。ここでの操作は表側にもそのまま反映される。 */
  checked: boolean;
  taskName: string;
}

export interface DailyTaskPhaseGroup {
  phaseId: string;
  phaseName: string;
  sortOrder: number;
  tasks: DailyTaskItem[];
}

export interface DailyTaskProjectGroup {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  sortOrder: number;
  phases: DailyTaskPhaseGroup[];
}
