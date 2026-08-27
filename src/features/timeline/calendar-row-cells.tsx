"use client";

import { cn } from "@/lib/utils";
import { DAY_WIDTH_PX } from "./constants";
import { getDayBgColorClass } from "./date-utils";
import { useTimelineDays } from "./timeline-context";

/**
 * 階層ツリーの各行（Group/Subgroup/Project/Phase）に付随するカレンダー部分。
 * 土日祝の色分けのみ行い、高さはサイドバーセルにflexで自動追従する。
 * タスクバーの表示・ドラッグ登録はPhase 3/4で追加する。
 */
export function CalendarRowCells() {
  const days = useTimelineDays();

  return (
    <div className="flex">
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={cn("shrink-0 border-r", getDayBgColorClass(day))}
          style={{ width: DAY_WIDTH_PX }}
        />
      ))}
    </div>
  );
}
