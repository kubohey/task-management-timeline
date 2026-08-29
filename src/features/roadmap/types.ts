/**
 * ロードマップの列。既存Projectを選んで作成する（docs/spec.md §2.6）。
 * labelはProject名で初期化されるが、以後は独立して自由編集できる
 * （実際のProject名（projects.name）は変更されない）。
 */
export interface RoadmapColumnRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  label: string;
  width: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RoadmapTaskSourceType = "project" | "phase";

/**
 * ロードマップの週セルに埋め込む1タスクブロック。既存Project/Phaseを選んで埋め込む。
 * labelは埋め込み時の名前で初期化されるが、以後は独立して自由編集でき、Phase表・
 * カレンダー側のデータには影響しない。背景色だけはsource_project_id
 * （Phase埋め込みの場合はそのPhaseが属するProjectのid）経由で連動し続ける。
 */
export interface RoadmapTaskRecord {
  id: string;
  column_id: string;
  source_type: RoadmapTaskSourceType;
  source_project_id: string | null;
  source_phase_id: string | null;
  label: string;
  /** 開始週の月曜日（yyyy-MM-dd）。 */
  start_week: string;
  /** 終了週の月曜日（yyyy-MM-dd、start_week以上）。 */
  end_week: string;
  created_at: string;
  updated_at: string;
}
