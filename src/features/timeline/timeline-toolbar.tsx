"use client";

import {
  addDays,
  addMonths,
  addYears,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore, type TimelineScale } from "@/store/ui-store";
import { formatAnchorLabel } from "./date-utils";

const SCALE_LABELS: Record<TimelineScale, string> = {
  day: "日（2週間）",
  month: "月",
  year: "年",
};

/** タイムラインの表示スケール（日/月/年）切替と、前後ナビゲーションを提供する。 */
export function TimelineToolbar() {
  const anchorDate = useUiStore((s) => s.timelineAnchorDate);
  const setTimelineAnchorDate = useUiStore((s) => s.setTimelineAnchorDate);
  const scale = useUiStore((s) => s.timelineScale);
  const setTimelineScale = useUiStore((s) => s.setTimelineScale);
  const requestScrollToToday = useUiStore((s) => s.requestScrollToToday);

  const shift = (direction: 1 | -1) => {
    if (scale === "day") {
      setTimelineAnchorDate(direction === 1 ? addDays(anchorDate, 14) : subDays(anchorDate, 14));
    } else if (scale === "year") {
      setTimelineAnchorDate(direction === 1 ? addYears(anchorDate, 1) : subYears(anchorDate, 1));
    } else {
      setTimelineAnchorDate(direction === 1 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1));
    }
  };

  const goToday = () => {
    const now = new Date();
    if (scale === "year") {
      setTimelineAnchorDate(startOfYear(now));
    } else if (scale === "day") {
      setTimelineAnchorDate(now);
    } else {
      setTimelineAnchorDate(startOfMonth(now));
    }
    requestScrollToToday();
  };

  const changeScale = (next: TimelineScale) => {
    setTimelineScale(next);
    // スケールを開いたときは常に今日を含む範囲に揃え、今日が画面中央あたりに来るようにする。
    const now = new Date();
    if (next === "year") {
      setTimelineAnchorDate(startOfYear(now));
    } else if (next === "month") {
      setTimelineAnchorDate(startOfMonth(now));
    } else {
      setTimelineAnchorDate(now);
    }
    requestScrollToToday();
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <div className="mr-1 flex items-center gap-0.5 rounded-md border p-0.5">
        {(Object.keys(SCALE_LABELS) as TimelineScale[]).map((key) => (
          <Button
            key={key}
            type="button"
            variant={scale === key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => changeScale(key)}
          >
            {SCALE_LABELS[key]}
          </Button>
        ))}
      </div>
      <Button type="button" variant="ghost" size="icon-xs" onClick={() => shift(-1)} title="前へ">
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-[8em] text-center font-medium">
        {formatAnchorLabel(scale, anchorDate)}
      </span>
      <Button type="button" variant="ghost" size="icon-xs" onClick={() => shift(1)} title="次へ">
        <ChevronRightIcon />
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={goToday}>
        今日
      </Button>
    </div>
  );
}
