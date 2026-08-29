import { createClient } from "@/lib/supabase/client";
import type { RoadmapColumnRecord, RoadmapTaskRecord, RoadmapTaskSourceType } from "./types";

// ============================================================
// 取得
// ============================================================

export async function fetchRoadmapColumns(): Promise<RoadmapColumnRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmap_columns")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoadmapTasks(): Promise<RoadmapTaskRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("roadmap_tasks").select("*");
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// 列（roadmap_columns）
// ============================================================

export async function insertRoadmapColumn(input: {
  userId: string;
  projectId: string;
  label: string;
  sortOrder: number;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_columns").insert({
    user_id: input.userId,
    project_id: input.projectId,
    label: input.label,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

export type RoadmapColumnPatch = Partial<Pick<RoadmapColumnRecord, "label" | "width" | "sort_order">>;

export async function updateRoadmapColumn(id: string, patch: RoadmapColumnPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_columns").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoadmapColumn(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_columns").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// タスクブロック（roadmap_tasks）
// ============================================================

export async function insertRoadmapTask(input: {
  columnId: string;
  sourceType: RoadmapTaskSourceType;
  sourceProjectId: string | null;
  sourcePhaseId: string | null;
  label: string;
  startWeek: string;
  endWeek: string;
  /** 手動ブロック用の背景色。Project/Phase埋め込みでは未指定（null）でよい。 */
  color?: string | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_tasks").insert({
    column_id: input.columnId,
    source_type: input.sourceType,
    source_project_id: input.sourceProjectId,
    source_phase_id: input.sourcePhaseId,
    label: input.label,
    start_week: input.startWeek,
    end_week: input.endWeek,
    color: input.color ?? null,
  });
  if (error) throw error;
}

export type RoadmapTaskPatch = Partial<
  Pick<RoadmapTaskRecord, "label" | "start_week" | "end_week" | "color" | "lane_order">
>;

export async function updateRoadmapTask(id: string, patch: RoadmapTaskPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoadmapTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_tasks").delete().eq("id", id);
  if (error) throw error;
}
