import type { PhaseRecord, ProjectRecord } from "@/features/hierarchy/types";
import type { RoadmapTaskRecord } from "./types";

/**
 * タスクブロックの背景色を、埋め込み元（Project/Phase）の現在の色から解決する。
 * Phase埋め込みの場合は、そのPhaseが属するProjectの色を使う（メインのガントチャートで
 * タスクチップの色をProjectに揃えているのと同じ方針、docs/spec.md §2.2）。
 * ラベル文字列とは異なりこの色は独立コピーせず常に最新の色を参照するため、
 * カレンダー形式のガントチャート側で色を変えるとロードマップ側にも反映される。
 * 埋め込み元が削除されていた場合はnull（呼び出し側で既定色にフォールバックする）。
 */
export function resolveRoadmapTaskColor(
  task: Pick<RoadmapTaskRecord, "source_type" | "source_project_id" | "source_phase_id">,
  projectsById: Map<string, ProjectRecord>,
  phasesById: Map<string, PhaseRecord>,
): string | null {
  if (task.source_type === "phase" && task.source_phase_id) {
    const phase = phasesById.get(task.source_phase_id);
    const projectId = phase?.project_id ?? task.source_project_id;
    return (projectId && projectsById.get(projectId)?.color) ?? null;
  }
  return (task.source_project_id && projectsById.get(task.source_project_id)?.color) ?? null;
}
