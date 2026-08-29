import { isAfter, parseISO } from "date-fns";
import type { RoadmapTaskRecord } from "./types";

/**
 * 同じ列（Project）内で週範囲が重なる複数のタスクブロックを、重ならない「レーン」に
 * 横並びで振り分ける（ユーザー要望：「同じプロジェクト内で別のタスクを並行して
 * 行う予定の場合、タスクの並列表示をしてほしい」）。
 *
 * 列全体で一律に「最大レーン数で等分」してしまうと、列のどこかで3つ重なる期間が
 * あるだけで、まったく別の時期にある単独タスクまで無駄に幅が狭くなってしまう。
 * そのため、時間的に連続して重なり合うタスクの塊（クラスター）ごとに独立して
 * レーン数を数え、各タスクは自分が属するクラスターのレーン数でだけ幅を決める。
 */
export function assignRoadmapLanes(tasks: RoadmapTaskRecord[]): {
  laneById: Record<string, number>;
  laneCountById: Record<string, number>;
} {
  const sorted = [...tasks].sort(
    (a, b) => parseISO(a.start_week).getTime() - parseISO(b.start_week).getTime(),
  );

  const laneById: Record<string, number> = {};
  const laneCountById: Record<string, number> = {};

  let cluster: RoadmapTaskRecord[] = [];
  let clusterMaxEnd: Date | null = null;

  const flushCluster = () => {
    if (cluster.length === 0) {
      return;
    }
    // クラスター内だけで区間スケジューリングの貪欲法：開始週順に見て、
    // 空いている最初のレーンに詰めていく。
    const laneEndDates: Date[] = [];
    for (const task of cluster) {
      const start = parseISO(task.start_week);
      const end = parseISO(task.end_week);
      const laneIndex = laneEndDates.findIndex((laneEnd) => isAfter(start, laneEnd));
      if (laneIndex === -1) {
        laneById[task.id] = laneEndDates.length;
        laneEndDates.push(end);
      } else {
        laneById[task.id] = laneIndex;
        laneEndDates[laneIndex] = end;
      }
    }
    const clusterLaneCount = Math.max(1, laneEndDates.length);
    for (const task of cluster) {
      laneCountById[task.id] = clusterLaneCount;
    }
    cluster = [];
    clusterMaxEnd = null;
  };

  for (const task of sorted) {
    const start = parseISO(task.start_week);
    const end = parseISO(task.end_week);
    // それまでのクラスター全体の最終週より後に始まる＝重なりが途切れたので、
    // 前のクラスターを確定して新しいクラスターを開始する。
    if (clusterMaxEnd !== null && isAfter(start, clusterMaxEnd)) {
      flushCluster();
    }
    cluster.push(task);
    if (clusterMaxEnd === null || end > clusterMaxEnd) {
      clusterMaxEnd = end;
    }
  }
  flushCluster();

  return { laneById, laneCountById };
}
