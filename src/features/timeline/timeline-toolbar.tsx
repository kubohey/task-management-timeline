"use client";

import { addMonths, startOfMonth, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { formatMonthLabel } from "./date-utils";

/** タイムラインの表示月を前後に切り替えるナビゲーション。 */
export function TimelineToolbar() {
  const anchorDate = useUiStore((s) => s.timelineAnchorDate);
  const setTimelineAnchorDate = useUiStore((s) => s.setTimelineAnchorDate);

  return (
    <div className="flex items-center gap-1 text-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setTimelineAnchorDate(subMonths(anchorDate, 1))}
        title="前月"
      >
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-[6em] text-center font-medium">{formatMonthLabel(anchorDate)}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setTimelineAnchorDate(addMonths(anchorDate, 1))}
        title="次月"
      >
        <ChevronRightIcon />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setTimelineAnchorDate(startOfMonth(new Date()))}
      >
        今日
      </Button>
    </div>
  );
}
