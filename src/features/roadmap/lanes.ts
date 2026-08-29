import { assignIntervalLanes } from "@/features/shared/interval-lanes";
import type { RoadmapTaskRecord } from "./types";

/**
 * 同じ列（Project）内で週範囲が重なる複数のタスクブロックを、重ならない「レーン」に
 * 横並びで振り分ける（列の幅をレーン数で等分する）。
 */
export function assignRoadmapLanes(tasks: RoadmapTaskRecord[]): {
  laneById: Record<string, number>;
  laneCount: number;
} {
  return assignIntervalLanes(
    tasks,
    (t) => t.id,
    (t) => t.start_week,
    (t) => t.end_week,
  );
}
