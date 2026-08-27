"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUiStore, type PhaseStatusFilterKey } from "@/store/ui-store";
import { STATUS_LABELS, STATUS_STYLES } from "./status-select";

const FILTER_ORDER: PhaseStatusFilterKey[] = ["active", "next", "always", "none"];

const FILTER_LABELS: Record<PhaseStatusFilterKey, string> = {
  ...STATUS_LABELS,
  none: "未設定",
};

const FILTER_STYLES: Record<PhaseStatusFilterKey, string> = {
  ...STATUS_STYLES,
  none: "bg-muted text-muted-foreground",
};

/**
 * Phase一覧をstatusで絞り込むフィルター。バッジを押すたびに該当statusの表示/非表示を切り替える。
 * docs/spec.md §8 Phase7「statusによるソート/フィルタ」
 */
export function PhaseStatusFilter() {
  const hiddenPhaseStatuses = useUiStore((s) => s.hiddenPhaseStatuses);
  const togglePhaseStatusFilter = useUiStore((s) => s.togglePhaseStatusFilter);

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">Phase絞り込み:</span>
      {FILTER_ORDER.map((key) => {
        const hidden = hiddenPhaseStatuses.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => togglePhaseStatusFilter(key)}
            title={hidden ? `${FILTER_LABELS[key]}を表示する` : `${FILTER_LABELS[key]}を非表示にする`}
          >
            <Badge
              variant={hidden ? "outline" : "default"}
              className={cn("cursor-pointer", !hidden && FILTER_STYLES[key], hidden && "text-muted-foreground opacity-50")}
            >
              {FILTER_LABELS[key]}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
