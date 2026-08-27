/** ユーザーが自由に追加・編集・削除できるPhaseのstatus定義。 */
export interface PhaseStatusRecord {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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
  status_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
