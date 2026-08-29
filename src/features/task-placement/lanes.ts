import { isAfter, parseISO } from "date-fns";
import type { TaskPlacementRecord } from "./types";

/** チップ1レーンあたりの高さ（px）。複数タスクが同じ日に重なる場合に縦積みする際の1段分。 */
export const CHIP_LANE_HEIGHT_PX = 20;
/** レーン間の縦の隙間（px）。 */
export const CHIP_LANE_GAP_PX = 3;

/**
 * 同じPhase内で日付範囲が重なる予定を、重ならない「レーン」に振り分ける
 * （区間スケジューリングの貪欲法：開始日順に見て、空いている最初のレーンに詰める）。
 * 1日に複数タスクを登録した場合にチップを横に並べず縦積みで全件表示するために使う
 * （docs/spec.md §2.2・§2.3、1日1タスクの制約を撤廃）。
 */
export function assignLanes(placements: TaskPlacementRecord[]): {
  laneById: Record<string, number>;
  laneCount: number;
} {
  const sorted = [...placements].sort(
    (a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime(),
  );
  // レーンごとに、そのレーンに直近で置いた予定の終了日を覚えておく。
  const laneEndDates: Date[] = [];
  const laneById: Record<string, number> = {};

  for (const placement of sorted) {
    const start = parseISO(placement.start_date);
    const end = parseISO(placement.end_date);
    const laneIndex = laneEndDates.findIndex((laneEnd) => isAfter(start, laneEnd));
    if (laneIndex === -1) {
      laneById[placement.id] = laneEndDates.length;
      laneEndDates.push(end);
    } else {
      laneById[placement.id] = laneIndex;
      laneEndDates[laneIndex] = end;
    }
  }

  return { laneById, laneCount: Math.max(1, laneEndDates.length) };
}
