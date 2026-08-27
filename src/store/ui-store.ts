import { create } from "zustand";

export type TimelineScale = "day" | "month" | "year";
export type PhaseSortMode = "manual" | "status";

interface UiState {
  timelineScale: TimelineScale;
  isFullscreen: boolean;
  /** Phase一覧の並び替えモード（追加順 or statusソート）。docs/spec.md §2.1 */
  phaseSortMode: PhaseSortMode;
  setTimelineScale: (scale: TimelineScale) => void;
  setFullscreen: (value: boolean) => void;
  setPhaseSortMode: (mode: PhaseSortMode) => void;
}

/**
 * UIの一時状態のみを保持するストア（永続データはSupabase側で管理）。
 * 折りたたみ状態などPhase 1以降で必要になる項目はここに追加していく。
 */
export const useUiStore = create<UiState>((set) => ({
  timelineScale: "month",
  isFullscreen: false,
  phaseSortMode: "manual",
  setTimelineScale: (timelineScale) => set({ timelineScale }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setPhaseSortMode: (phaseSortMode) => set({ phaseSortMode }),
}));
