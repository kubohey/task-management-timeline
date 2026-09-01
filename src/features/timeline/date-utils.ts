import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isToday,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import holidayJp from "holiday-jp";
import type { TimelineScale } from "@/store/ui-store";

/**
 * 指定日を含む月の全日付を返す（月表示ガントチャート用）。
 * docs/spec.md §6「表示スケール（日/月/年）はdate-fnsの区間生成関数で列を再生成」
 */
export function getMonthDays(anchor: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) });
}

/** 基準日を中心とした前後2週間（計14日）の日付を返す（日表示用）。 */
export function getTwoWeekDays(anchor: Date): Date[] {
  return eachDayOfInterval({ start: subDays(anchor, 7), end: addDays(anchor, 6) });
}

/**
 * 基準日を含む年の全日付を返す（年表示用）。
 * 列数が非常に多くなるため、実際の描画はtimeline-context.tsxで仮想化する。
 */
export function getYearDays(anchor: Date): Date[] {
  return eachDayOfInterval({ start: startOfYear(anchor), end: endOfYear(anchor) });
}

/** 表示スケールに応じたタイムラインの日付列を返す。 */
export function getTimelineDays(scale: TimelineScale, anchor: Date): Date[] {
  if (scale === "day") {
    return getTwoWeekDays(anchor);
  }
  if (scale === "year") {
    return getYearDays(anchor);
  }
  return getMonthDays(anchor);
}

/** 指定日が日本の祝日かどうか（holiday-jp）。 */
export function isJapaneseHoliday(date: Date): boolean {
  return holidayJp.isHoliday(date);
}

/**
 * 日付文字色のTailwindクラス。土曜=青、日曜・祝日=赤。docs/spec.md §2.4
 */
export function getDayTextColorClass(date: Date): string {
  if (date.getDay() === 0 || isJapaneseHoliday(date)) {
    return "text-red-600";
  }
  if (date.getDay() === 6) {
    return "text-blue-600";
  }
  return "text-foreground";
}

/**
 * 日付セル背景色のTailwindクラス。今日＝明るい緑（半透明）、outsideタグの日＝薄いグレー、
 * 土曜=薄青、日曜・祝日=薄赤。優先度は 今日 > outsideタグ > 土日祝 の順（今日は他の色分けより
 * 優先して目立たせる。outsideタグは「その日はプロジェクトのタスクを進められない」という
 * 個別の予定なので、単なる曜日の色分けより優先する）。
 */
export function getDayBgColorClass(date: Date, isOutsideDay = false): string {
  if (isToday(date)) {
    return "bg-green-400/25";
  }
  if (isOutsideDay) {
    return "bg-gray-300/60";
  }
  if (date.getDay() === 0 || isJapaneseHoliday(date)) {
    return "bg-red-50";
  }
  if (date.getDay() === 6) {
    return "bg-blue-50";
  }
  return "bg-background";
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** ヘッダーセルに表示する曜日ラベル（例：「月」）。 */
export function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

/** ツールバーに表示する月ラベル（例：「2026年8月」）。 */
export function formatMonthLabel(date: Date): string {
  return format(date, "yyyy年M月");
}

/** ツールバーに表示する、表示スケールに応じたラベル（月：「2026年8月」/日：「8/20 〜 9/2」/年：「2026年」）。 */
export function formatAnchorLabel(scale: TimelineScale, anchor: Date): string {
  if (scale === "year") {
    return format(anchor, "yyyy年");
  }
  if (scale === "day") {
    return `${format(subDays(anchor, 7), "M/d")} 〜 ${format(addDays(anchor, 6), "M/d")}`;
  }
  return formatMonthLabel(anchor);
}
