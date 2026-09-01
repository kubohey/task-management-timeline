import type { JSONContent } from "@tiptap/react";

/**
 * プロジェクト外の予定（旅行など、プロジェクトのタスクを進められない日）を表すタグ。
 * ガントチャートはこのタグが付いた日の列を薄いグレーで塗りつぶす（date-utils.ts参照）。
 */
export const OUTSIDE_TAG = "outside" as const;

/** daily_notesテーブル1件（ユーザー×日付で一意）。本文はTiptapのdoc構造。 */
export interface DailyNoteRecord {
  id: string;
  user_id: string;
  date: string;
  content: JSONContent;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * その日にカレンダー登録された1タスク。ノート作成時の初期本文（タスク一覧の雛形）を
 * 組み立てるためだけに使う値であり、ノート保存後はPhase表の行との結びつきを持たない
 * （§2.5「デイリーノート内の編集はPhase表と連動しない」）。
 */
export interface DailyTaskItem {
  taskName: string;
  checked: boolean;
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
  sortOrder: number;
  phases: DailyTaskPhaseGroup[];
}
