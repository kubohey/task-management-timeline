"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PhaseRecord, ProjectRecord } from "@/features/hierarchy/types";
import { cn } from "@/lib/utils";
import { assignRoadmapLanes } from "./lanes";
import { resolveRoadmapTaskColor } from "./resolve-task-color";
import { RoadmapTaskBlock } from "./roadmap-task-block";
import { RoadmapTaskPicker, type RoadmapTaskSelection } from "./roadmap-task-picker";
import { useCreateRoadmapTask, useUpdateRoadmapTask } from "./use-roadmap-mutations";
import { isCurrentWeek, weekKey, WEEK_ROW_HEIGHT_PX } from "./week-utils";
import type { RoadmapColumnRecord, RoadmapTaskRecord } from "./types";

interface RoadmapColumnStripProps {
  column: RoadmapColumnRecord;
  weeks: Date[];
  tasks: RoadmapTaskRecord[];
  projects: ProjectRecord[];
  phases: PhaseRecord[];
  projectsById: Map<string, ProjectRecord>;
  phasesById: Map<string, PhaseRecord>;
  /** タスクブロックのドラッグ移動を確定する（複数選択中なら選択分すべてまとめて移動、RoadmapView側で判定）。 */
  onMoveTask: (taskId: string, deltaWeeks: number) => void;
}

interface WeekCellProps {
  column: RoadmapColumnRecord;
  week: Date;
  projects: ProjectRecord[];
  phases: PhaseRecord[];
}

/** 週セルの背景。クリックするとその週にタスクを埋め込むピッカーが開く。 */
function WeekCell({ column, week, projects, phases }: WeekCellProps) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateRoadmapTask();

  const handleSelect = (selection: RoadmapTaskSelection) => {
    const iso = weekKey(week);
    createTask.mutate({
      columnId: column.id,
      sourceType: selection.sourceType,
      sourceProjectId: selection.sourceProjectId,
      sourcePhaseId: selection.sourcePhaseId,
      label: selection.label,
      startWeek: iso,
      endWeek: iso,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "block w-full shrink-0 cursor-pointer border-b hover:bg-accent/40",
            isCurrentWeek(week) && "bg-green-400/10",
          )}
          style={{ height: WEEK_ROW_HEIGHT_PX }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <RoadmapTaskPicker
          projects={projects}
          phases={phases}
          preferredProjectId={column.project_id}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * ロードマップの1列（Project）分の縦ストリップ。背景の週セル（クリックで埋め込み）
 * の上に、タスクブロックを絶対配置で重ねる。週範囲が重なるタスクはレーン分けして
 * 横並びに表示する（docs/spec.md §2.6）。
 */
export function RoadmapColumnStrip({
  column,
  weeks,
  tasks,
  projects,
  phases,
  projectsById,
  phasesById,
  onMoveTask,
}: RoadmapColumnStripProps) {
  const updateTask = useUpdateRoadmapTask();
  const { laneById, laneCountById } = useMemo(() => assignRoadmapLanes(tasks), [tasks]);
  const weekIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    weeks.forEach((week, index) => map.set(weekKey(week), index));
    return map;
  }, [weeks]);

  // 並列表示（同じ週範囲で重なるブロック）の左右を入れ替える。隣のレーンにいる
  // タスク（週範囲が重なっているもの＝同じクラスター）を探し、lane_orderを
  // 交換する（PhaseStatusManager/Phase一覧の▲▼と同じ、隣同士の値を入れ替える方式）。
  // ユーザー要望：「同じプロジェクト内で並列に置いたタスクを左右に入れ替えられない？」
  const swapLane = (task: RoadmapTaskRecord, direction: -1 | 1) => {
    const targetLane = (laneById[task.id] ?? 0) + direction;
    const neighbor = tasks.find(
      (t) =>
        t.id !== task.id &&
        (laneById[t.id] ?? 0) === targetLane &&
        !(t.end_week < task.start_week || t.start_week > task.end_week),
    );
    if (!neighbor) {
      return;
    }
    updateTask.mutate({ id: task.id, patch: { lane_order: neighbor.lane_order } });
    updateTask.mutate({ id: neighbor.id, patch: { lane_order: task.lane_order } });
  };

  return (
    <div
      className="relative shrink-0 border-r"
      style={{ width: column.width, height: weeks.length * WEEK_ROW_HEIGHT_PX }}
    >
      <div className="flex flex-col">
        {weeks.map((week) => (
          <WeekCell
            key={weekKey(week)}
            column={column}
            week={week}
            projects={projects}
            phases={phases}
          />
        ))}
      </div>
      {tasks.map((task) => {
        const startIndex = weekIndexByKey.get(task.start_week);
        if (startIndex === undefined) {
          // 表示範囲外の週に開始する（固定範囲の外）タスクは表示しない。
          return null;
        }
        const currentLane = laneById[task.id] ?? 0;
        const currentLaneCount = laneCountById[task.id] ?? 1;
        return (
          <RoadmapTaskBlock
            key={task.id}
            task={task}
            startIndex={startIndex}
            lane={currentLane}
            laneCount={currentLaneCount}
            color={resolveRoadmapTaskColor(task, projectsById, phasesById)}
            onMoveCommit={(deltaWeeks) => onMoveTask(task.id, deltaWeeks)}
            onMoveLeft={currentLane > 0 ? () => swapLane(task, -1) : undefined}
            onMoveRight={currentLane < currentLaneCount - 1 ? () => swapLane(task, 1) : undefined}
          />
        );
      })}
    </div>
  );
}
