"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useUiStore } from "@/store/ui-store";
import { getMonthDays } from "./date-utils";

const TimelineDaysContext = createContext<Date[] | null>(null);

/**
 * タイムラインの表示日付一覧をcontext経由で各行（Group/Project/Phase）に配る。
 * propsのバケツリレーを避けるため。docs/spec.md §6
 */
export function TimelineDaysProvider({ children }: { children: ReactNode }) {
  const anchorDate = useUiStore((s) => s.timelineAnchorDate);
  const days = useMemo(() => getMonthDays(anchorDate), [anchorDate]);

  return <TimelineDaysContext value={days}>{children}</TimelineDaysContext>;
}

export function useTimelineDays(): Date[] {
  const days = useContext(TimelineDaysContext);
  if (!days) {
    throw new Error("useTimelineDays must be used within a TimelineDaysProvider");
  }
  return days;
}
