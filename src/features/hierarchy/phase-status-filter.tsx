"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { usePhaseStatuses } from "./phase-statuses-context";

/** status未割り当てのPhaseを表すフィルターキー。 */
const NONE_KEY = "none";

/**
 * Phase一覧をstatusで絞り込むフィルター。バッジを押すたびに該当statusの表示/非表示を切り替える。
 * docs/spec.md §8 Phase7「statusによるソート/フィルタ」
 */
export function PhaseStatusFilter() {
  const statuses = usePhaseStatuses();
  const hiddenPhaseStatuses = useUiStore((s) => s.hiddenPhaseStatuses);
  const togglePhaseStatusFilter = useUiStore((s) => s.togglePhaseStatusFilter);

  if (statuses.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">Filter phases:</span>
      {statuses.map((s) => {
        const hidden = hiddenPhaseStatuses.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => togglePhaseStatusFilter(s.id)}
            title={hidden ? `Show ${s.name}` : `Hide ${s.name}`}
          >
            <Badge
              variant={hidden ? "outline" : "default"}
              className={cn(
                "cursor-pointer",
                !hidden && "text-foreground",
                hidden && "text-muted-foreground opacity-50",
              )}
              style={hidden ? undefined : { backgroundColor: s.color }}
            >
              {s.name}
            </Badge>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => togglePhaseStatusFilter(NONE_KEY)}
        title={hiddenPhaseStatuses.includes(NONE_KEY) ? "Show unset" : "Hide unset"}
      >
        <Badge
          variant={hiddenPhaseStatuses.includes(NONE_KEY) ? "outline" : "secondary"}
          className={cn(
            "cursor-pointer",
            hiddenPhaseStatuses.includes(NONE_KEY) && "text-muted-foreground opacity-50",
          )}
        >
          None
        </Badge>
      </button>
    </div>
  );
}
