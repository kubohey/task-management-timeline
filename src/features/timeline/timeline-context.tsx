"use client";

import { createContext, useContext, useMemo, type ReactNode, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useUiStore } from "@/store/ui-store";
import { DAY_WIDTH_PX } from "./constants";
import { getTimelineDays } from "./date-utils";

interface TimelineDaysContextValue {
  /** 表示スケールに応じた日付の全量（インデックス計算・タスクチップの位置決めに使う）。 */
  days: Date[];
  /** 実際にDOMへ描画すべき範囲（年表示では仮想化により一部のみ）。 */
  startIndex: number;
  endIndex: number;
  /** startIndexより前の非表示分を埋めるスペーサー幅（px）。 */
  leadingWidth: number;
  /** endIndexより後の非表示分を埋めるスペーサー幅（px）。 */
  trailingWidth: number;
}

const TimelineDaysContext = createContext<TimelineDaysContextValue | null>(null);

interface TimelineDaysProviderProps {
  children: ReactNode;
  /** タイムライン全体が横スクロールするコンテナ（年表示の横方向仮想化の基準）。 */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * タイムラインの表示日付一覧をcontext経由で各行（Group/Project/Phase）に配る。
 * propsのバケツリレーを避けるため。docs/spec.md §6
 *
 * 年表示は列数が365〜366と多くなるため、TanStack Virtualで横方向に仮想化し、
 * 実際にDOMへ描画するのは画面内＋オーバースキャン分の日付のみに絞る（docs/spec.md §6）。
 * 日/月表示は列数が少ないため常に全日付を描画する（startIndex=0, endIndex=末尾）。
 */
export function TimelineDaysProvider({ children, scrollContainerRef }: TimelineDaysProviderProps) {
  const anchorDate = useUiStore((s) => s.timelineAnchorDate);
  const scale = useUiStore((s) => s.timelineScale);
  const days = useMemo(() => getTimelineDays(scale, anchorDate), [scale, anchorDate]);

  const virtualizer = useVirtualizer({
    count: days.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => DAY_WIDTH_PX,
    horizontal: true,
    overscan: 14,
  });

  // virtualizerの戻り値はスクロールのたびに変わるためuseMemoでの恩恵は薄く、素直に毎レンダー計算する。
  let value: TimelineDaysContextValue;
  if (scale !== "year") {
    value = { days, startIndex: 0, endIndex: days.length - 1, leadingWidth: 0, trailingWidth: 0 };
  } else {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) {
      value = { days, startIndex: 0, endIndex: -1, leadingWidth: 0, trailingWidth: days.length * DAY_WIDTH_PX };
    } else {
      const first = virtualItems[0];
      const last = virtualItems[virtualItems.length - 1];
      value = {
        days,
        startIndex: first.index,
        endIndex: last.index,
        leadingWidth: first.start,
        trailingWidth: virtualizer.getTotalSize() - last.end,
      };
    }
  }

  return <TimelineDaysContext value={value}>{children}</TimelineDaysContext>;
}

export function useTimelineDays(): TimelineDaysContextValue {
  const value = useContext(TimelineDaysContext);
  if (!value) {
    throw new Error("useTimelineDays must be used within a TimelineDaysProvider");
  }
  return value;
}
