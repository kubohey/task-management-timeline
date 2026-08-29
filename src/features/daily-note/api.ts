import type { JSONContent } from "@tiptap/react";
import { emptyDoc } from "@/features/phase-table/types";
import { createClient } from "@/lib/supabase/client";
import type { DailyNoteRecord, DailyTaskProjectGroup } from "./types";

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

// ============================================================
// その日にカレンダー登録されたタスク一覧（Project > Phase > タスク）
// ============================================================

/** table_cells 1件をPostgREストの入れ子selectで取得したときの形。 */
interface RawCell {
  column_id: string;
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
        color: string | null;
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
          projects ( id, name, color, sort_order )
        ),
        table_cells ( column_id, value, table_columns ( key ) )
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
        projectColor: project.color,
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

    phaseGroup.tasks.push({
      placementId: placement.id,
      rowId: row.id,
      phaseId: row.phase_id,
      checkboxColumnId: checkboxCell?.column_id,
      checked,
      taskName: taskName || "(無題のタスク)",
    });
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
