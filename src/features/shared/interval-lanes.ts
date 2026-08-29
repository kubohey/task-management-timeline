import { isAfter, parseISO } from "date-fns";

/**
 * 区間スケジューリングの貪欲法：開始日（または開始週）順に見て、重ならない最初の
 * レーンに詰めていく。日付範囲が重なる複数のアイテム（同じ日の複数タスク、
 * ロードマップ上で週範囲が重なる複数のタスクブロック等）を、重ならないレーンに
 * 振り分けて並べて表示するために使う共通ロジック。
 */
export function assignIntervalLanes<T>(
  items: T[],
  getId: (item: T) => string,
  getStart: (item: T) => string,
  getEnd: (item: T) => string,
): { laneById: Record<string, number>; laneCount: number } {
  const sorted = [...items].sort(
    (a, b) => parseISO(getStart(a)).getTime() - parseISO(getStart(b)).getTime(),
  );
  // レーンごとに、そのレーンに直近で置いたアイテムの終了日を覚えておく。
  const laneEndDates: Date[] = [];
  const laneById: Record<string, number> = {};

  for (const item of sorted) {
    const start = parseISO(getStart(item));
    const end = parseISO(getEnd(item));
    const laneIndex = laneEndDates.findIndex((laneEnd) => isAfter(start, laneEnd));
    if (laneIndex === -1) {
      laneById[getId(item)] = laneEndDates.length;
      laneEndDates.push(end);
    } else {
      laneById[getId(item)] = laneIndex;
      laneEndDates[laneIndex] = end;
    }
  }

  return { laneById, laneCount: Math.max(1, laneEndDates.length) };
}
