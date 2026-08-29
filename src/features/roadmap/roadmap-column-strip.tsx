"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PhaseRecord, ProjectRecord } from "@/features/hierarchy/types";
import { cn } from "@/lib/utils";
import { resolveRoadmapTaskColor } from "./resolve-task-color";
import { RoadmapTaskBlock } from "./roadmap-task-block";
import { RoadmapTaskPicker, type RoadmapTaskSelection } from "./roadmap-task-picker";
import { useCreateRoadmapTask } from "./use-roadmap-mutations";
import { isCurrentWeek, weekKey, WEEK_ROW_HEIGHT_PX } from "./week-utils";
import type { RoadmapColumnRecord, RoadmapTaskRecord } from "./types";

interface RoadmapColumnStripProps {
  column: RoadmapColumnRecord;
  /** 表示に使う実効幅（ドラッグ中はRoadmapView側のライブ値、そうでなければcolumn.width）。 */
  width: number;
  weeks: Date[];
  tasks: RoadmapTaskRecord[];
  projects: ProjectRecord[];
  phases: PhaseRecord[];
  projectsById: Map<string, ProjectRecord>;
  phasesById: Map<string, PhaseRecord>;
  /** タスクブロックのドラッグ移動を確定する（週数・サブ列数の差分。複数選択中なら選択分すべてまとめて移動、RoadmapView側で判定）。 */
  onMoveTask: (taskId: string, deltaWeeks: number, deltaLanes: number) => void;
}

interface WeekCellProps {
  column: RoadmapColumnRecord;
  week: Date;
  /** このセルが属するサブ列（0始まり）。ここでタスクを作成するとこのサブ列に置かれる。 */
  lane: number;
  projects: ProjectRecord[];
  phases: PhaseRecord[];
}

/** 週セルの背景。クリックするとその週・そのサブ列にタスクを埋め込むピッカーが開く。 */
function WeekCell({ column, week, lane, projects, phases }: WeekCellProps) {
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
      lane,
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

interface SubLaneStripProps {
  column: RoadmapColumnRecord;
  lane: number;
  laneWidth: number;
  weeks: Date[];
  /** このサブ列（lane）に属するタスクのみ。 */
  tasks: RoadmapTaskRecord[];
  projects: ProjectRecord[];
  phases: PhaseRecord[];
  projectsById: Map<string, ProjectRecord>;
  phasesById: Map<string, PhaseRecord>;
  weekIndexByKey: Map<string, number>;
  onMoveTask: (taskId: string, deltaWeeks: number, deltaLanes: number) => void;
}

/** 列内の1サブ列分の縦ストリップ。背景の週セル＋そのサブ列に属するタスクブロックを重ねる。 */
function SubLaneStrip({
  column,
  lane,
  laneWidth,
  weeks,
  tasks,
  projects,
  phases,
  projectsById,
  phasesById,
  weekIndexByKey,
  onMoveTask,
}: SubLaneStripProps) {
  return (
    <div
      className="relative shrink-0 border-r"
      style={{ width: laneWidth, height: weeks.length * WEEK_ROW_HEIGHT_PX }}
    >
      <div className="flex flex-col">
        {weeks.map((week) => (
          <WeekCell
            key={weekKey(week)}
            column={column}
            week={week}
            lane={lane}
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
        return (
          <RoadmapTaskBlock
            key={task.id}
            task={task}
            startIndex={startIndex}
            laneWidthPx={laneWidth}
            color={resolveRoadmapTaskColor(task, projectsById, phasesById)}
            onMoveCommit={(deltaWeeks, deltaLanes) => onMoveTask(task.id, deltaWeeks, deltaLanes)}
          />
        );
      })}
    </div>
  );
}

/**
 * ロードマップの1列（Project）分。週範囲が重なるかどうかで自動計算していたレーンを
 * やめ、ユーザーがヘッダーの「＋」で増やせる明示的なサブ列（roadmap_columns.lane_count
 * 本）に置き換えた。各タスクは常にどれか1つのサブ列（roadmap_tasks.lane）に属し、
 * 別の週で重ならないタスク同士でも横位置が自動でズレることはない。タスクは移動ハンドルの
 * ドラッグで別の週・別のサブ列へ自由に動かせる（docs/spec.md §2.6）。
 */
export function RoadmapColumnStrip({
  column,
  width,
  weeks,
  tasks,
  projects,
  phases,
  projectsById,
  phasesById,
  onMoveTask,
}: RoadmapColumnStripProps) {
  const weekIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    weeks.forEach((week, index) => map.set(weekKey(week), index));
    return map;
  }, [weeks]);

  const tasksByLane = useMemo(() => {
    const map = new Map<number, RoadmapTaskRecord[]>();
    for (const task of tasks) {
      const bucket = map.get(task.lane) ?? [];
      bucket.push(task);
      map.set(task.lane, bucket);
    }
    return map;
  }, [tasks]);

  const laneWidth = width / column.lane_count;

  return (
    <div className="flex shrink-0">
      {Array.from({ length: column.lane_count }, (_, lane) => (
        <SubLaneStrip
          key={lane}
          column={column}
          lane={lane}
          laneWidth={laneWidth}
          weeks={weeks}
          tasks={tasksByLane.get(lane) ?? []}
          projects={projects}
          phases={phases}
          projectsById={projectsById}
          phasesById={phasesById}
          weekIndexByKey={weekIndexByKey}
          onMoveTask={onMoveTask}
        />
      ))}
    </div>
  );
}
