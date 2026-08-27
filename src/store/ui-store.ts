import { startOfMonth } from "date-fns";
import { create } from "zustand";

export type TimelineScale = "day" | "month" | "year";
export type PhaseSortMode = "manual" | "status";

interface UiState {
  timelineScale: TimelineScale;
  isFullscreen: boolean;
  /** Phase一覧の並び替えモード（追加順 or statusソート）。docs/spec.md §2.1 */
  phaseSortMode: PhaseSortMode;
  /** タイムラインに表示する基準日（月表示ではこの日を含む月を表示）。 */
  timelineAnchorDate: Date;
  setTimelineScale: (scale: TimelineScale) => void;
  setFullscreen: (value: boolean) => void;
  setPhaseSortMode: (mode: PhaseSortMode) => void;
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
  timelineAnchorDate: startOfMonth(new Date()),
  setTimelineScale: (timelineScale) => set({ timelineScale }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setPhaseSortMode: (phaseSortMode) => set({ phaseSortMode }),
  setTimelineAnchorDate: (timelineAnchorDate) => set({ timelineAnchorDate }),
}));
