import { startOfMonth } from "date-fns";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

/** 画面全体の拡大縮小表示（ガントチャート・ロードマップ共通）。CSSのzoomプロパティで実現する。 */
export const ZOOM_MIN_PERCENT = 50;
export const ZOOM_MAX_PERCENT = 150;
export const ZOOM_STEP_PERCENT = 10;
const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX_PERCENT, Math.max(ZOOM_MIN_PERCENT, value));

/**
 * Phase行のタスク表（Popoverオーバーレイ）の表示サイズ。ユーザー要望
 *「表の表示サイズを自分で調整できるようにして」により、右下の隅をドラッグして
 * 幅・高さを自由に変更できるようにする。全Phase共通の一つの設定として扱う
 * （Phaseごとに覚えるのはやりすぎで、毎回同じ使い勝手を期待できる方が実用的）。
 */
export const TASK_TABLE_PANEL_DEFAULT_WIDTH_PX = 480;
export const TASK_TABLE_PANEL_MIN_WIDTH_PX = 320;
export const TASK_TABLE_PANEL_MAX_WIDTH_PX = 1200;
export const TASK_TABLE_PANEL_DEFAULT_HEIGHT_PX = 320;
export const TASK_TABLE_PANEL_MIN_HEIGHT_PX = 160;
export const TASK_TABLE_PANEL_MAX_HEIGHT_PX = 900;
const clampTaskTablePanelWidth = (value: number) =>
  Math.min(TASK_TABLE_PANEL_MAX_WIDTH_PX, Math.max(TASK_TABLE_PANEL_MIN_WIDTH_PX, value));
const clampTaskTablePanelHeight = (value: number) =>
  Math.min(TASK_TABLE_PANEL_MAX_HEIGHT_PX, Math.max(TASK_TABLE_PANEL_MIN_HEIGHT_PX, value));

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
   * インクリメントするたびに「対象日を画面中央あたりまでスクロールする」処理を
   * 発火させるための信号。スクロール処理自体はtimeline-context.tsx側で行う。
   * 通常のprev/next移動では発火させず、初回表示・スケール切替・「今日」ボタン・
   * タスク検索結果の選択でのみ発火する。
   */
  scrollToTodaySignal: number;
  /**
   * scrollToTodaySignal発火時にスクロール先とする日付（"yyyy-MM-dd"）。nullなら
   * 従来どおり「今日」を対象にする。タスク検索でジャンプする際に設定する
   * （ユーザー要望：「カレンダーに登録しているタスクの検索機能がほしい」）。
   */
  scrollTargetDate: string | null;
  /**
   * タスク検索でジャンプした直後、該当のタスクチップを一時的にハイライトするためのid。
   * 一定時間後に自動でnullへ戻る。
   */
  highlightedPlacementId: string | null;
  /** デイリータスクノート（右サイドバー）で開いている日付（"yyyy-MM-dd"）。nullで非表示。 */
  dailyNoteDate: string | null;
  /** デイリータスクノートのサイドバー幅（px）。ウィンドウ幅調整と同様、ドラッグで可変。 */
  dailyNoteWidth: number;
  /** ガントチャート画面の拡大縮小率（%、100が等倍）。 */
  ganttZoomPercent: number;
  /** ロードマップ画面の拡大縮小率（%、100が等倍）。 */
  roadmapZoomPercent: number;
  /** Phase行のタスク表（Popoverオーバーレイ）の幅（px）。右下の隅をドラッグして可変。 */
  taskTablePanelWidth: number;
  /** Phase行のタスク表（Popoverオーバーレイ）の高さ（px）。右下の隅をドラッグして可変。 */
  taskTablePanelHeight: number;
  /**
   * ロードマップで複数選択中のタスクブロックid一覧。選択済みのブロックをドラッグ
   * すると、選択中のブロックすべてを同じ週数だけまとめて移動する
   * （ユーザー要望：「複数選択して同時にセルのドラッグができると嬉しい」）。
   */
  selectedRoadmapTaskIds: string[];
  /**
   * 折りたたみ表示中のPhase表の列id一覧。ユーザー要望「Phase内の各列をトグルで
   * 折りたたみたい」により、列ごとに幅を最小化して非表示にできるようにする。
   * 列idはtable_columns.idそのもの（Phaseをまたいで一意）なので、キーを分ける必要はない。
   */
  collapsedPhaseTableColumnIds: string[];
  setTimelineScale: (scale: TimelineScale) => void;
  setFullscreen: (value: boolean) => void;
  setPhaseSortMode: (mode: PhaseSortMode) => void;
  togglePhaseStatusFilter: (key: PhaseStatusFilterKey) => void;
  setTimelineAnchorDate: (date: Date) => void;
  requestScrollToToday: () => void;
  /** 指定日（"yyyy-MM-dd"）を画面中央あたりまでスクロールする。タスク検索結果の選択用。 */
  requestScrollToDate: (date: string) => void;
  /** タスクチップを一定時間ハイライトする。タスク検索結果の選択用。 */
  highlightPlacement: (placementId: string) => void;
  openDailyNote: (date: string) => void;
  closeDailyNote: () => void;
  setDailyNoteWidth: (width: number) => void;
  setGanttZoomPercent: (value: number) => void;
  setRoadmapZoomPercent: (value: number) => void;
  setTaskTablePanelSize: (size: { width: number; height: number }) => void;
  toggleSelectedRoadmapTask: (id: string) => void;
  clearSelectedRoadmapTasks: () => void;
  toggleCollapsedPhaseTableColumn: (columnId: string) => void;
}

/**
 * UIの一時状態のみを保持するストア（永続データはSupabase側で管理）。
 * 折りたたみ状態などPhase 1以降で必要になる項目はここに追加していく。
 *
 * 画面全体の拡大縮小率（ganttZoomPercent/roadmapZoomPercent）とタスク表パネルの
 * サイズ（taskTablePanelWidth/Height）のみ、ブラウザのlocalStorageへ永続化する
 * （ユーザー要望：「毎回100%にするのではなく、前回のズーム率のまま表示して
 * 欲しい」「表の表示サイズを自分で調整できるようにして」）。他の項目（タイムラインの
 * 基準日・選択状態など）は
 * 画面を開くたびにリセットされるべき一時状態なので対象外（partializeで絞る）。
 * SSR時にlocalStorageへ触れて壊れないよう`skipHydration: true`にし、実際の
 * 読み込みはマウント後（`Providers`内）に`useUiStore.persist.rehydrate()`で行う。
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      timelineScale: "month",
      isFullscreen: false,
      phaseSortMode: "manual",
      hiddenPhaseStatuses: [],
      timelineAnchorDate: startOfMonth(new Date()),
      scrollToTodaySignal: 0,
      scrollTargetDate: null,
      highlightedPlacementId: null,
      dailyNoteDate: null,
      dailyNoteWidth: DAILY_NOTE_DEFAULT_WIDTH_PX,
      ganttZoomPercent: 100,
      roadmapZoomPercent: 100,
      taskTablePanelWidth: TASK_TABLE_PANEL_DEFAULT_WIDTH_PX,
      taskTablePanelHeight: TASK_TABLE_PANEL_DEFAULT_HEIGHT_PX,
      selectedRoadmapTaskIds: [],
      collapsedPhaseTableColumnIds: [],
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
      requestScrollToToday: () =>
        set((state) => ({ scrollToTodaySignal: state.scrollToTodaySignal + 1, scrollTargetDate: null })),
      requestScrollToDate: (date) =>
        set((state) => ({ scrollToTodaySignal: state.scrollToTodaySignal + 1, scrollTargetDate: date })),
      highlightPlacement: (placementId) => {
        set({ highlightedPlacementId: placementId });
        setTimeout(() => {
          set((state) =>
            state.highlightedPlacementId === placementId ? { highlightedPlacementId: null } : {},
          );
        }, 2500);
      },
      openDailyNote: (date) => set({ dailyNoteDate: date }),
      closeDailyNote: () => set({ dailyNoteDate: null }),
      setDailyNoteWidth: (width) =>
        set({
          dailyNoteWidth: Math.min(DAILY_NOTE_MAX_WIDTH_PX, Math.max(DAILY_NOTE_MIN_WIDTH_PX, width)),
        }),
      setGanttZoomPercent: (value) => set({ ganttZoomPercent: clampZoom(value) }),
      setRoadmapZoomPercent: (value) => set({ roadmapZoomPercent: clampZoom(value) }),
      setTaskTablePanelSize: ({ width, height }) =>
        set({
          taskTablePanelWidth: clampTaskTablePanelWidth(width),
          taskTablePanelHeight: clampTaskTablePanelHeight(height),
        }),
      toggleSelectedRoadmapTask: (id) =>
        set((state) => ({
          selectedRoadmapTaskIds: state.selectedRoadmapTaskIds.includes(id)
            ? state.selectedRoadmapTaskIds.filter((taskId) => taskId !== id)
            : [...state.selectedRoadmapTaskIds, id],
        })),
      clearSelectedRoadmapTasks: () => set({ selectedRoadmapTaskIds: [] }),
      toggleCollapsedPhaseTableColumn: (columnId) =>
        set((state) => ({
          collapsedPhaseTableColumnIds: state.collapsedPhaseTableColumnIds.includes(columnId)
            ? state.collapsedPhaseTableColumnIds.filter((id) => id !== columnId)
            : [...state.collapsedPhaseTableColumnIds, columnId],
        })),
    }),
    {
      name: "timeline-ui-zoom",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        ganttZoomPercent: state.ganttZoomPercent,
        roadmapZoomPercent: state.roadmapZoomPercent,
        taskTablePanelWidth: state.taskTablePanelWidth,
        taskTablePanelHeight: state.taskTablePanelHeight,
        collapsedPhaseTableColumnIds: state.collapsedPhaseTableColumnIds,
      }),
    },
  ),
);
