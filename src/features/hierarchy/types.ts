export type PhaseStatus = "active" | "always" | "next";

export interface GroupRecord {
  id: string;
  user_id: string;
  parent_group_id: string | null;
  name: string;
  color: string | null;
  sort_order: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecord {
  id: string;
  group_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhaseRecord {
  id: string;
  project_id: string;
  name: string;
  status: PhaseStatus | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
