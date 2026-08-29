"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_PX } from "./constants";
import { getDayBgColorClass, getDayTextColorClass, getWeekdayLabel } from "./date-utils";
import { useTimelineDays } from "./timeline-context";

interface MonthGroup {
  key: string;
  label: string;
  span: number;
}

/**
 * 可視範囲の日付を月ごとにグルーピングする（年表示・日（2週間）表示で月をまたぐ際に
 * 「今どの月を見ているか」を表示するため。docs/spec.md §8 Phase7）。
 */
function buildMonthGroups(days: Date[], startIndex: number, endIndex: number): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const label = format(days[i], "MMM yyyy");
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.span += 1;
    } else {
      groups.push({ key: label, label, span: 1 });
    }
  }
  return groups;
}

/**
 * 上部の日付ヘッダー。月ラベル行＋日付行の2段構成で、全体が sticky top、
 * その中のコーナーセルが sticky left であることで、左上のコーナーが常に画面に
 * 固定される（2軸固定、docs/spec.md §6）。
 */
export function TimelineHeader() {
  const { days, startIndex, endIndex, leadingWidth, trailingWidth, totalWidth, dayWidth } =
    useTimelineDays();
  const openDailyNote = useUiStore((s) => s.openDailyNote);
  const dailyNoteDate = useUiStore((s) => s.dailyNoteDate);
  const monthGroups = useMemo(
    () => buildMonthGroups(days, startIndex, endIndex),
    [days, startIndex, endIndex],
  );

  return (
    <div
      className="sticky top-0 z-20 flex flex-col bg-background"
      style={{ width: SIDEBAR_WIDTH_PX + totalWidth }}
    >
      <div className="flex items-stretch border-b">
        <div
          className="sticky left-0 z-20 shrink-0 border-r bg-background"
          style={{ width: SIDEBAR_WIDTH_PX }}
        />
        <div className="flex">
          {leadingWidth > 0 && <div className="shrink-0" style={{ width: leadingWidth }} />}
          {monthGroups.map((group) => (
            <div
              key={group.key}
              className="shrink-0 truncate border-r py-0.5 text-center text-xs font-medium text-muted-foreground"
              style={{ width: group.span * dayWidth }}
            >
              {group.label}
            </div>
          ))}
          {trailingWidth > 0 && <div className="shrink-0" style={{ width: trailingWidth }} />}
        </div>
      </div>
      <div className="flex items-stretch border-b">
        <div
          className="sticky left-0 z-20 shrink-0 border-r bg-background"
          style={{ width: SIDEBAR_WIDTH_PX }}
        />
        <div className="flex">
          {leadingWidth > 0 && <div className="shrink-0" style={{ width: leadingWidth }} />}
          {days.slice(startIndex, endIndex + 1).map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            return (
              <button
                key={day.toISOString()}
                type="button"
                title="Click to open this day's note"
                onClick={() => openDailyNote(iso)}
                className={cn(
                  "flex shrink-0 flex-col items-center border-r py-1 text-xs hover:brightness-95",
                  getDayTextColorClass(day),
                  getDayBgColorClass(day),
                  dailyNoteDate === iso && "ring-1 ring-inset ring-primary",
                )}
                style={{ width: dayWidth }}
              >
                <span>{day.getDate()}</span>
                <span>{getWeekdayLabel(day)}</span>
              </button>
            );
          })}
          {trailingWidth > 0 && <div className="shrink-0" style={{ width: trailingWidth }} />}
        </div>
      </div>
    </div>
  );
}
