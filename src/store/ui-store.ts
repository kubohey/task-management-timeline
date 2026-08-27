import { startOfMonth } from "date-fns";
import { create } from "zustand";

export type TimelineScale = "day" | "month" | "year";
export type PhaseSortMode = "manual" | "status";
/** Phase一覧の表示フィルタで扱うキー。status未設定分は"none"で表す。 */
export type PhaseStatusFilterKey = "active" | "next" | "always" | "none";

interface UiState {
  timelineScale: TimelineScale;
  isFullscreen: boolean;
  /** Phase一覧の並び替えモード（追加順 or statusソート）。docs/spec.md §2.1 */
  phaseSortMode: PhaseSortMode;
  /** 非表示にするstatus。空配列＝全て表示。docs/spec.md §8 Phase7「statusによるソート/フィルタ」 */
  hiddenPhaseStatuses: PhaseStatusFilterKey[];
  /** タイムラインに表示する基準日（月表示ではこの日を含む月を表示、日表示では基準日を中心とした2週間、年表示ではこの日を含む年）。 */
  timelineAnchorDate: Date;
  setTimelineScale: (scale: TimelineScale) => void;
  setFullscreen: (value: boolean) => void;
  setPhaseSortMode: (mode: PhaseSortMode) => void;
  togglePhaseStatusFilter: (key: PhaseStatusFilterKey) => void;
  setTimelineAnchorDate: (date: Date) => void;
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
}));
