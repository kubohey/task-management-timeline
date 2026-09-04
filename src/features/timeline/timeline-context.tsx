"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import type { JSONContent } from "@tiptap/react";
import { observeElementOffset, useVirtualizer } from "@tanstack/react-virtual";
import { format, isToday } from "date-fns";
import { useOutsideContentNotes } from "@/features/daily-note/use-outside-content-notes";
import { useOutsideDates } from "@/features/daily-note/use-outside-dates";
import { useUiStore } from "@/store/ui-store";
import { DAY_SCALE_WIDTH_PX, DAY_WIDTH_PX, SIDEBAR_WIDTH_PX } from "./constants";
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
  /**
   * カレンダー部分（サイドバーを除く）の総幅（px）＝days.length×dayWidth。
   * leadingWidth+可視セル分+trailingWidthの合計と数学的には一致するはずだが、
   * 各行のsticky領域の基準幅にはスクロール状態に依存しないこちらの値を使い、
   * スクロール中の仮想化再計算タイミングとは無関係に常に正しい幅を保証する。
   */
  totalWidth: number;
  /**
   * 1日あたりのセル幅（px）。日（2週間）表示は列数が少なく余白ができやすいため、
   * 月/年表示より広い幅を使う（docs/spec.md §2.4）。
   */
  dayWidth: number;
  /**
   * 「outside」タグ（プロジェクト外の予定）が付いた日付（yyyy-MM-dd）の集合。
   * この日はガントチャートの列を薄いグレーで塗りつぶす（date-utils.tsのgetDayBgColorClass参照）。
   */
  outsideDates: Set<string>;
  /**
   * outside専用メモ欄に中身がある日付→本文（Tiptap doc）のMap。日付ヘッダー上の
   * 折りたたみ可能な吹き出し（outside-task-callouts.tsx）に使う。
   */
  outsideContentNotes: Map<string, JSONContent>;
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
  const dayWidth = scale === "day" ? DAY_SCALE_WIDTH_PX : DAY_WIDTH_PX;

  // スクロール位置（scrollLeft）は実際の画面ピクセル（zoom適用後）で動くが、
  // 仮想化（年表示）のestimateSize/オフセット計算はzoom前の論理ピクセル基準。
  // このズレを補正しないと、zoomが100%以外のときにTanStack Virtualが
  // 「今どの日付範囲が画面内か」を誤計算し、実際は表示領域内のはずの日付が
  // 仮想化で描画対象から外れてカレンダーが空白になる不具合があった
  // （ユーザー報告：「ガントチャートで90％以下のズーム率にするとカレンダーが
  // 表示されない」、年表示のときのみ発生）。zoomは動的に変わるため、購読時に
  // 固定値を閉じ込めないようrefで最新値を参照する（observeElementOffsetは
  // スクロール要素が変わらない限り初回しか再購読されない仕組みのため）。
  const ganttZoomPercent = useUiStore((s) => s.ganttZoomPercent);
  const zoomFactorRef = useRef(ganttZoomPercent / 100);
  zoomFactorRef.current = ganttZoomPercent / 100;

  const virtualizer = useVirtualizer({
    count: days.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => dayWidth,
    horizontal: true,
    overscan: 14,
    observeElementOffset: (instance, cb) =>
      observeElementOffset(instance, (offset, isScrolling) => {
        cb(offset / zoomFactorRef.current, isScrolling);
      }),
  });

  const totalWidth = days.length * dayWidth;
  const outsideDates = useOutsideDates();
  const outsideContentNotes = useOutsideContentNotes();

  // virtualizerの戻り値はスクロールのたびに変わるためuseMemoでの恩恵は薄く、素直に毎レンダー計算する。
  let value: TimelineDaysContextValue;
  if (scale !== "year") {
    value = {
      days,
      startIndex: 0,
      endIndex: days.length - 1,
      leadingWidth: 0,
      trailingWidth: 0,
      totalWidth,
      dayWidth,
      outsideDates,
      outsideContentNotes,
    };
  } else {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) {
      value = {
        days,
        startIndex: 0,
        endIndex: -1,
        leadingWidth: 0,
        trailingWidth: totalWidth,
        totalWidth,
        dayWidth,
        outsideDates,
        outsideContentNotes,
      };
    } else {
      const first = virtualItems[0];
      const last = virtualItems[virtualItems.length - 1];
      value = {
        days,
        startIndex: first.index,
        endIndex: last.index,
        leadingWidth: first.start,
        trailingWidth: totalWidth - last.end,
        totalWidth,
        dayWidth,
        outsideDates,
        outsideContentNotes,
      };
    }
  }

  // 初回表示時・スケール切替時・「今日」ボタン押下時・タスク検索結果の選択時
  // （scrollToTodaySignalの変化）に、対象日（scrollTargetDate、未指定なら今日）が
  // カレンダー表示領域のちょうど真ん中あたりに来るようスクロール位置を調整する。
  // 通常のprev/next移動ではこの信号は変化しないため、意図せず引き戻されることはない。
  const scrollToTodaySignal = useUiStore((s) => s.scrollToTodaySignal);
  const scrollTargetDate = useUiStore((s) => s.scrollTargetDate);
  const daysRef = useRef(days);
  daysRef.current = days;
  const scrollTargetDateRef = useRef(scrollTargetDate);
  scrollTargetDateRef.current = scrollTargetDate;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const target = scrollTargetDateRef.current;
    const targetIndex = target
      ? daysRef.current.findIndex((d) => format(d, "yyyy-MM-dd") === target)
      : daysRef.current.findIndex((d) => isToday(d));
    if (targetIndex === -1) {
      return;
    }
    // scrollLeftは実際の画面ピクセル（zoom適用後）で動くが、dayWidth/SIDEBAR_WIDTH_PXは
    // zoom前の論理ピクセルのため、計算にはzoom倍率を掛ける必要がある。zoomの変更だけでは
    // 再スクロールしたくない（ズーム操作のたびに今日へ引き戻されると使いづらい）ため、
    // zoomFactorRefで最新値だけ参照し、依存配列には含めない（上の仮想化オフセット補正と共用）。
    const zoomFactor = zoomFactorRef.current;
    const visibleCalendarWidth = container.clientWidth - SIDEBAR_WIDTH_PX * zoomFactor;
    if (visibleCalendarWidth <= 0) {
      return;
    }
    const targetCenterPos = (targetIndex * dayWidth + dayWidth / 2) * zoomFactor;
    const targetScrollLeft = targetCenterPos - visibleCalendarWidth / 2;
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollLeft = Math.min(Math.max(0, targetScrollLeft), maxScrollLeft);
    // daysはdaysRef経由で最新値を参照するため依存配列には含めない（含めるとprev/next移動のたびに発火してしまう）。
    // dayWidthはscaleにのみ依存し、prev/next移動では変化しないため依存配列に含めてよい。
  }, [scrollToTodaySignal, scrollContainerRef, dayWidth]);

  return <TimelineDaysContext value={value}>{children}</TimelineDaysContext>;
}

export function useTimelineDays(): TimelineDaysContextValue {
  const value = useContext(TimelineDaysContext);
  if (!value) {
    throw new Error("useTimelineDays must be used within a TimelineDaysProvider");
  }
  return value;
}
