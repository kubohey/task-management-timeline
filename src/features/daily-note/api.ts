import type { JSONContent } from "@tiptap/react";
import { emptyDoc } from "@/features/phase-table/types";
import { createClient } from "@/lib/supabase/client";
import {
  OUTSIDE_TAG,
  type DailyNoteRecord,
  type DailyTaskProjectGroup,
  type OutsideTaskItem,
} from "./types";

// ============================================================
// ノート本文（daily_notes）
// ============================================================

/** 指定日のノートを取得する。まだ作成されていない場合はnullを返す（本文は呼び出し側で空docにする）。 */
export async function fetchDailyNote(date: string): Promise<DailyNoteRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 本文を保存する。初回編集時はinsert、以降はupdateになるようuser_id+dateでupsertする。 */
export async function upsertDailyNote(input: {
  userId: string;
  date: string;
  content: JSONContent;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_notes")
    .upsert(
      { user_id: input.userId, date: input.date, content: input.content },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

/**
 * ノートのタグ一覧を保存する（本文とは独立して更新するため、upsertDailyNoteとは分ける）。
 * contentを含めないので、既にノートが存在する場合はcontentを上書きしない。未作成の場合は
 * DB側のデフォルト（空doc）でinsertされる。
 */
export async function setDailyNoteTags(input: { userId: string; date: string; tags: string[] }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_notes")
    .upsert(
      { user_id: input.userId, date: input.date, tags: input.tags },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

/**
 * 「outside」タグ（プロジェクト外の予定）が付いている日付一覧を取得する。
 * ガントチャートの列を薄いグレーで塗りつぶす判定に使う（timeline-context.tsx参照）。
 */
export async function fetchOutsideDates(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("date")
    .contains("tags", [OUTSIDE_TAG]);
  if (error) throw error;
  return (data ?? []).map((row) => row.date as string);
}

/**
 * outside専用タスク欄（本文とは別のjsonb配列）を保存する。tagsと同じく本文を含めずに
 * 更新するため、既にノートが存在する場合はcontentを上書きしない。
 */
export async function setOutsideTasks(input: {
  userId: string;
  date: string;
  tasks: OutsideTaskItem[];
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_notes")
    .upsert(
      { user_id: input.userId, date: input.date, outside_tasks: input.tasks },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

/**
 * 「outside」タグが付いた日付のうち、専用タスク欄に1件以上項目があるものを取得する。
 * カレンダーの日付ヘッダー上の吹き出し（outside-task-callouts.tsx）に使う。
 */
export async function fetchOutsideTaskNotes(): Promise<
  { date: string; tasks: OutsideTaskItem[] }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("date, outside_tasks")
    .contains("tags", [OUTSIDE_TAG]);
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      date: row.date as string,
      tasks: (row.outside_tasks as OutsideTaskItem[] | null) ?? [],
    }))
    .filter((row) => row.tasks.length > 0);
}

// ============================================================
// その日にカレンダー登録されたタスク一覧（Project > Phase > タスク）
// ============================================================

/** table_cells 1件をPostgREストの入れ子selectで取得したときの形。 */
interface RawCell {
  value: unknown;
  table_columns: { key: string } | null;
}

interface RawPlacement {
  id: string;
  table_rows: {
    id: string;
    phase_id: string;
    phases: {
      id: string;
      name: string;
      sort_order: number;
      projects: {
        id: string;
        name: string;
        sort_order: number;
      } | null;
    } | null;
    table_cells: RawCell[] | null;
  } | null;
}

/**
 * 指定日にカレンダー登録されているタスクを、Project > Phase > タスクの階層に
 * 組み立てて取得する。task_placementsはPhase表の行への参照のため、行のセル
 * （チェックボックス・タスク名）まで1回のPostgREST入れ子selectでまとめて取る。
 * RLSは各テーブル自身のポリシーがjoin経由でもそのまま効く（docs/spec.md §5参照）。
 *
 * この結果はノート本文の初期値（タスク一覧の雛形）を組み立てる用途にのみ使う
 * （§2.5「ノート保存後はPhase表と連動しない」）ため、Phase表の行ID列などは含めない。
 */
export async function fetchDailyTasks(date: string): Promise<DailyTaskProjectGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_placements")
    .select(
      `
      id,
      table_rows (
        id,
        phase_id,
        phases (
          id, name, sort_order,
          projects ( id, name, sort_order )
        ),
        table_cells ( value, table_columns ( key ) )
      )
    `,
    )
    .lte("start_date", date)
    .gte("end_date", date)
    .returns<RawPlacement[]>();
  if (error) throw error;

  const projectsById = new Map<string, DailyTaskProjectGroup>();

  for (const placement of data ?? []) {
    const row = placement.table_rows;
    const phase = row?.phases;
    const project = phase?.projects;
    if (!row || !phase || !project) {
      // Phase表の行が削除された直後などで参照が欠けている場合はスキップ（CASCADE削除で
      // 通常は起こらないが、Realtime反映のタイムラグ対策として防御的に無視する）。
      continue;
    }

    const cells = row.table_cells ?? [];
    const taskNameCell = cells.find((c) => c.table_columns?.key === "task_name");
    const checkboxCell = cells.find((c) => c.table_columns?.key === "checkbox");
    const taskName = (taskNameCell?.value as { text?: string } | undefined)?.text ?? "";
    const checked = (checkboxCell?.value as { checked?: boolean } | undefined)?.checked ?? false;

    let projectGroup = projectsById.get(project.id);
    if (!projectGroup) {
      projectGroup = {
        projectId: project.id,
        projectName: project.name,
        sortOrder: project.sort_order,
        phases: [],
      };
      projectsById.set(project.id, projectGroup);
    }

    let phaseGroup = projectGroup.phases.find((p) => p.phaseId === phase.id);
    if (!phaseGroup) {
      phaseGroup = { phaseId: phase.id, phaseName: phase.name, sortOrder: phase.sort_order, tasks: [] };
      projectGroup.phases.push(phaseGroup);
    }

    phaseGroup.tasks.push({ checked, taskName: taskName || "(無題のタスク)" });
  }

  const projectGroups = [...projectsById.values()];
  projectGroups.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const project of projectGroups) {
    project.phases.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return projectGroups;
}

/** 空のノート本文（初期表示・未作成時用）。 */
export { emptyDoc };
