"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDayBgColorClass } from "./date-utils";
import { useTimelineDays } from "./timeline-context";

/**
 * 階層ツリーの各行（Group/Subgroup/Project/Phase）に付随するカレンダー部分。
 * 土日祝・outsideタグ（プロジェクト外の予定）の色分けのみ行い、高さはサイドバーセルに
 * flexで自動追従する。タスクバーの表示・ドラッグ登録はPhase 3/4で追加する。
 */
export function CalendarRowCells() {
  const { days, startIndex, endIndex, leadingWidth, trailingWidth, dayWidth, outsideDates } =
    useTimelineDays();

  return (
    <div className="flex">
      {leadingWidth > 0 && <div className="shrink-0" style={{ width: leadingWidth }} />}
      {days.slice(startIndex, endIndex + 1).map((day) => (
        <div
          key={day.toISOString()}
          className={cn(
            "shrink-0 border-r",
            getDayBgColorClass(day, outsideDates.has(format(day, "yyyy-MM-dd"))),
          )}
          style={{ width: dayWidth }}
        />
      ))}
      {trailingWidth > 0 && <div className="shrink-0" style={{ width: trailingWidth }} />}
    </div>
  );
}
