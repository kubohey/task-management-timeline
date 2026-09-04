"use client";

import { useRef, useState } from "react";
import { format, parseISO, startOfMonth, startOfYear } from "date-fns";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useUpdateGroup, useUpdateProject } from "@/features/hierarchy/use-hierarchy-mutations";
import { useUiStore } from "@/store/ui-store";
import { useTaskSearch, type TaskSearchResult } from "./use-task-search";

/**
 * カレンダーに登録済みのタスク（task_placements）をタスク名で検索するツールバー部品。
 * 結果を選択すると、そのタスクが属するGroup/Subgroup/Projectの折りたたみを解除し、
 * status絞り込みで隠れていれば解除したうえで、タイムラインを該当日へスクロールして
 * チップを一時ハイライトする。
 * ユーザー要望：「カレンダーに登録しているタスクの検索機能がほしい」
 */
export function TaskSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, groups, projects, phases } = useTaskSearch(query);
  const updateGroup = useUpdateGroup();
  const updateProject = useUpdateProject();
  const scale = useUiStore((s) => s.timelineScale);
  const setTimelineAnchorDate = useUiStore((s) => s.setTimelineAnchorDate);
  const requestScrollToDate = useUiStore((s) => s.requestScrollToDate);
  const highlightPlacement = useUiStore((s) => s.highlightPlacement);
  const hiddenPhaseStatuses = useUiStore((s) => s.hiddenPhaseStatuses);
  const togglePhaseStatusFilter = useUiStore((s) => s.togglePhaseStatusFilter);

  // 折りたたみ解除・status絞り込み解除の判定用（groups/projects/phasesはuseTaskSearch内で
  // hierarchy側と同じqueryKeyのキャッシュを共有しているため、ここでの参照は追加取得を伴わない）。
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const phaseById = new Map(phases.map((p) => [p.id, p]));

  /**
   * Phase行のDOM（phase-row.tsxで`phase-row-${phase.id}`を付与）が現れるまで待って
   * スクロールする。折りたたみ解除は非同期（DB更新→Realtime/invalidateを経て再描画）
   * のため、対象行が存在しない間は短い間隔でリトライする。
   */
  const scrollToPhaseRow = (phaseId: string, attemptsLeft = 20) => {
    const el = document.getElementById(`phase-row-${phaseId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => scrollToPhaseRow(phaseId, attemptsLeft - 1), 100);
    }
  };

  const jumpTo = (result: TaskSearchResult) => {
    for (const groupId of result.ancestorGroupIds) {
      if (groupById.get(groupId)?.is_collapsed) {
        updateGroup.mutate({ id: groupId, patch: { is_collapsed: false } });
      }
    }
    if (projectById.get(result.projectId)?.is_collapsed) {
      updateProject.mutate({ id: result.projectId, patch: { is_collapsed: false } });
    }
    const statusKey = phaseById.get(result.phaseId)?.status_id ?? "none";
    if (hiddenPhaseStatuses.includes(statusKey)) {
      togglePhaseStatusFilter(statusKey);
    }

    // タイムラインの表示範囲を対象日が含まれるよう合わせる
    // （timeline-toolbar.tsxのgoToday/changeScaleと同じスケール別の計算）。
    const target = parseISO(result.startDate);
    if (scale === "year") {
      setTimelineAnchorDate(startOfYear(target));
    } else if (scale === "day") {
      setTimelineAnchorDate(target);
    } else {
      setTimelineAnchorDate(startOfMonth(target));
    }
    requestScrollToDate(result.startDate);
    highlightPlacement(result.placementId);

    setOpen(false);
    inputRef.current?.blur();
    scrollToPhaseRow(result.phaseId);
  };

  const showResults = open && query.trim().length > 0;

  return (
    <Popover open={showResults} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            placeholder="タスクを検索"
            className="h-8 pl-7"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
          />
          {query && (
            <button
              type="button"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setQuery("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              title="クリア"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-80 w-80 overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            検索中...
          </div>
        ) : results.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">該当するタスクが見つかりません。</p>
        ) : (
          <ul className="flex flex-col">
            {results.map((r) => (
              <li key={r.placementId}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => jumpTo(r)}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {r.projectColor && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: r.projectColor }}
                      />
                    )}
                    <span className="truncate">{r.taskName}</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {r.groupPath} / {r.phaseName} ・ {format(parseISO(r.startDate), "yyyy/M/d")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
