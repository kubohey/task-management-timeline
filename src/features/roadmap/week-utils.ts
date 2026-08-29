import { addWeeks, differenceInCalendarWeeks, endOfWeek, format, isSameWeek, startOfWeek } from "date-fns";

/** 週セル1つの高さ（px）。 */
export const WEEK_ROW_HEIGHT_PX = 64;
/** 「週単位」列（週ラベル）の幅（px）。 */
export const WEEK_LABEL_WIDTH_PX = 104;
/** 列（Project）のデフォルト幅（px）。 */
export const DEFAULT_COLUMN_WIDTH_PX = 220;
export const MIN_COLUMN_WIDTH_PX = 140;
export const MAX_COLUMN_WIDTH_PX = 640;

/** 表示範囲：今日を含む週を中心に、前後これだけの週数を表示する（無限スクロールはせず固定範囲）。 */
const WEEKS_BEFORE_TODAY = 12;
const WEEKS_AFTER_TODAY = 40;

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** 指定日を含む週の月曜日を返す（週の開始は月曜日固定、docs/spec.md §2.6）。 */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, WEEK_OPTS);
}

/** ロードマップに表示する週（各週の月曜日）の一覧。今日を含む週を中心とした固定範囲。 */
export function getRoadmapWeeks(anchor: Date = new Date()): Date[] {
  const centerMonday = startOfWeekMonday(anchor);
  const weeks: Date[] = [];
  for (let i = -WEEKS_BEFORE_TODAY; i <= WEEKS_AFTER_TODAY; i++) {
    weeks.push(addWeeks(centerMonday, i));
  }
  return weeks;
}

/** 週セルの見出しラベル（例：「8/24-8/30」）。 */
export function formatWeekLabel(monday: Date): string {
  return `${format(monday, "M/d")}-${format(endOfWeek(monday, WEEK_OPTS), "M/d")}`;
}

/** react key・DB保存用の週キー（月曜日、yyyy-MM-dd）。 */
export function weekKey(monday: Date): string {
  return format(monday, "yyyy-MM-dd");
}

/** 指定週が今日を含む週かどうか。 */
export function isCurrentWeek(monday: Date): boolean {
  return isSameWeek(monday, new Date(), WEEK_OPTS);
}

/** 2つの週（月曜日基準の日付）の間の週数差。 */
export function diffWeeks(a: Date, b: Date): number {
  return differenceInCalendarWeeks(a, b, WEEK_OPTS);
}
