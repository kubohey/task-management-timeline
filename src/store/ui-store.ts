import { startOfMonth } from "date-fns";
import { create } from "zustand";

export type TimelineScale = "day" | "month" | "year";
export type PhaseSortMode = "manual" | "status";
/**
 * Phase一覧の表示フィルタで扱うキー。phase_statuses.idそのもの、
 * またはstatus未設定分を表す"none"のいずれか。
 */
export type PhaseStatusFilterKey = string;

/** デイリータスクノートのサイドバー幅（px）。docs/spec.md §2.5参照。 */
export const DAILY_NOTE_DEFAULT_WIDTH_PX = 360;
export const DAILY_NOTE_MIN_WIDTH_PX = 280;
export const DAILY_NOTE_MAX_WIDTH_PX = 720;

interface UiState {
  timelineScale: TimelineScale;
  isFullscreen: boolean;
  /** Phase一覧の並び替えモード（追加順 or statusソート）。docs/spec.md §2.1 */
  phaseSortMode: PhaseSortMode;
  /** 非表示にするstatus。空配列＝全て表示。docs/spec.md §8 Phase7「statusによるソート/フィルタ」 */
  hiddenPhaseStatuses: PhaseStatusFilterKey[];
  /** タイムラインに表示する基準日（月表示ではこの日を含む月を表示、日表示では基準日を中心とした2週間、年表示ではこの日を含む年）。 */
  timelineAnchorDate: Date;
  /**
   * インクリメントするたびに「今日の日付を画面中央あたりまでスクロールする」処理を
   * 発火させるための信号。スクロール処理自体はtimeline-context.tsx側で行う。
   * 通常のprev/next移動では発火させず、初回表示・スケール切替・「今日」ボタンでのみ発火する。
   */
  scrollToTodaySignal: number;
  /** デイリータスクノート（右サイドバー）で開いている日付（"yyyy-MM-dd"）。nullで非表示。 */
  dailyNoteDate: string | null;
  /** デイリータスクノートのサイドバー幅（px）。ウィンドウ幅調整と同様、ドラッグで可変。 */
  dailyNoteWidth: number;
  setTimelineScale: (scale: TimelineScale) => void;
  setFullscreen: (value: boolean) => void;
  setPhaseSortMode: (mode: PhaseSortMode) => void;
  togglePhaseStatusFilter: (key: PhaseStatusFilterKey) => void;
  setTimelineAnchorDate: (date: Date) => void;
  requestScrollToToday: () => void;
  openDailyNote: (date: string) => void;
  closeDailyNote: () => void;
  setDailyNoteWidth: (width: number) => void;
}

/**
 * UIの一時状態のみを保持するストア（永続データはSupabase側で管理）。
 * 折りたたみ状態などPhase 1以降で必要になる項目はここに追加していく。
 */
export const useUiStore = create<UiState>((set) => ({
  timelineScale: "month",
  isFullscreen: false,
  phaseSortMode: "manual",
  hiddenPhaseStatuses: [],
  timelineAnchorDate: startOfMonth(new Date()),
  scrollToTodaySignal: 0,
  dailyNoteDate: null,
  dailyNoteWidth: DAILY_NOTE_DEFAULT_WIDTH_PX,
  setTimelineScale: (timelineScale) => set({ timelineScale }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setPhaseSortMode: (phaseSortMode) => set({ phaseSortMode }),
  togglePhaseStatusFilter: (key) =>
    set((state) => ({
      hiddenPhaseStatuses: state.hiddenPhaseStatuses.includes(key)
        ? state.hiddenPhaseStatuses.filter((k) => k !== key)
        : [...state.hiddenPhaseStatuses, key],
    })),
  setTimelineAnchorDate: (timelineAnchorDate) => set({ timelineAnchorDate }),
  requestScrollToToday: () => set((state) => ({ scrollToTodaySignal: state.scrollToTodaySignal + 1 })),
  openDailyNote: (date) => set({ dailyNoteDate: date }),
  closeDailyNote: () => set({ dailyNoteDate: null }),
  setDailyNoteWidth: (width) =>
    set({
      dailyNoteWidth: Math.min(DAILY_NOTE_MAX_WIDTH_PX, Math.max(DAILY_NOTE_MIN_WIDTH_PX, width)),
    }),
}));
