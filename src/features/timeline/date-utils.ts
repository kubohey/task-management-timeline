import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import holidayJp from "holiday-jp";

/**
 * 指定日を含む月の全日付を返す（月表示ガントチャート用）。
 * docs/spec.md §6「表示スケール（日/月/年）はdate-fnsの区間生成関数で列を再生成」
 */
export function getMonthDays(anchor: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) });
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

/** 日付セル背景色のTailwindクラス。土曜=薄青、日曜・祝日=薄赤。 */
export function getDayBgColorClass(date: Date): string {
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
