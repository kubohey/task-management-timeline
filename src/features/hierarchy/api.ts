import { createClient } from "@/lib/supabase/client";
import type { GroupRecord, PhaseRecord, PhaseStatus, ProjectRecord } from "./types";

// ============================================================
// 取得
// ============================================================

export async function fetchGroups(): Promise<GroupRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjects(): Promise<ProjectRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPhases(): Promise<PhaseRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("phases")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// groups（Group / Subgroup 共通。parent_group_id の有無で区別）
// ============================================================

export async function insertGroup(input: {
  userId: string;
  name: string;
  parentGroupId: string | null;
  sortOrder: number;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("groups").insert({
    user_id: input.userId,
    name: input.name,
    parent_group_id: input.parentGroupId,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

export type GroupPatch = Partial<
  Pick<GroupRecord, "name" | "color" | "is_collapsed" | "sort_order">
>;

export async function updateGroup(id: string, patch: GroupPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("groups").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// projects
// ============================================================

export async function insertProject(input: {
  groupId: string;
  name: string;
  sortOrder: number;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").insert({
    group_id: input.groupId,
    name: input.name,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

export type ProjectPatch = Partial<
  Pick<ProjectRecord, "name" | "color" | "is_collapsed" | "sort_order">
>;

export async function updateProject(id: string, patch: ProjectPatch) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// phases
// ============================================================

export async function insertPhase(input: {
  projectId: string;
  name: string;
  sortOrder: number;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("phases").insert({
    project_id: input.projectId,
    name: input.name,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

export type PhasePatch = Partial<Pick<PhaseRecord, "name" | "sort_order">> & {
  status?: PhaseStatus | null;
};

export async function updatePhase(id: string, patch: PhasePatch) {
  const supabase = createClient();
  const { error } = await supabase.from("phases").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePhase(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("phases").delete().eq("id", id);
  if (error) throw error;
}
