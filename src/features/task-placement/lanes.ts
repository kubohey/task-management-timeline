import { assignIntervalLanes } from "@/features/shared/interval-lanes";
import type { TaskPlacementRecord } from "./types";

/** チップ1レーンあたりの高さ（px）。複数タスクが同じ日に重なる場合に縦積みする際の1段分。 */
export const CHIP_LANE_HEIGHT_PX = 20;
/** レーン間の縦の隙間（px）。 */
export const CHIP_LANE_GAP_PX = 3;

/**
 * 同じPhase内で日付範囲が重なる予定を、重ならない「レーン」に振り分ける。
 * 1日に複数タスクを登録した場合にチップを横に並べず縦積みで全件表示するために使う
 * （docs/spec.md §2.2・§2.3、1日1タスクの制約を撤廃）。
 */
export function assignLanes(placements: TaskPlacementRecord[]): {
  laneById: Record<string, number>;
  laneCount: number;
} {
  return assignIntervalLanes(
    placements,
    (p) => p.id,
    (p) => p.start_date,
    (p) => p.end_date,
  );
}
