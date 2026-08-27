"use client";

import { cn } from "@/lib/utils";
import { DAY_WIDTH_PX, SIDEBAR_WIDTH_PX } from "./constants";
import { getDayTextColorClass, getWeekdayLabel } from "./date-utils";
import { useTimelineDays } from "./timeline-context";

/**
 * 上部の日付ヘッダー行。行全体が sticky top、その中のコーナーセルが sticky left
 * であることで、左上のコーナーが常に画面に固定される（2軸固定、docs/spec.md §6）。
 */
export function TimelineHeader() {
  const days = useTimelineDays();

  return (
    <div className="sticky top-0 z-20 flex items-stretch border-b bg-background">
      <div
        className="sticky left-0 z-20 shrink-0 border-r bg-background"
        style={{ width: SIDEBAR_WIDTH_PX }}
      />
      <div className="flex">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex shrink-0 flex-col items-center border-r py-1 text-xs",
              getDayTextColorClass(day),
            )}
            style={{ width: DAY_WIDTH_PX }}
          >
            <span>{day.getDate()}</span>
            <span>{getWeekdayLabel(day)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
