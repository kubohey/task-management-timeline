"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PhaseRecord, ProjectRecord } from "@/features/hierarchy/types";
import { cn } from "@/lib/utils";
import { assignRoadmapLanes } from "./lanes";
import { resolveRoadmapTaskColor } from "./resolve-task-color";
import { RoadmapTaskBlock } from "./roadmap-task-block";
import { RoadmapTaskPicker, type RoadmapTaskSelection } from "./roadmap-task-picker";
import { useCreateRoadmapTask } from "./use-roadmap-mutations";
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
}: RoadmapColumnStripProps) {
  const { laneById, laneCountById } = useMemo(() => assignRoadmapLanes(tasks), [tasks]);
  const weekIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    weeks.forEach((week, index) => map.set(weekKey(week), index));
    return map;
  }, [weeks]);

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
        return (
          <RoadmapTaskBlock
            key={task.id}
            task={task}
            startIndex={startIndex}
            lane={laneById[task.id] ?? 0}
            laneCount={laneCountById[task.id] ?? 1}
            color={resolveRoadmapTaskColor(task, projectsById, phasesById)}
          />
        );
      })}
    </div>
  );
}
