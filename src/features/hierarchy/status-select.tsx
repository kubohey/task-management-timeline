"use client";

import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePhaseStatuses } from "./phase-statuses-context";

interface StatusSelectProps {
  statusId: string | null;
  onChange: (statusId: string | null) => void;
}

/**
 * Phaseのstatus（ユーザー定義、phase_statusesテーブル）を付与・変更するドロップダウン。
 * status自体の追加・名前変更・色変更・削除は`PhaseStatusManager`（ツールバー）で行う。
 */
export function StatusSelect({ statusId, onChange }: StatusSelectProps) {
  const statuses = usePhaseStatuses();
  const current = statuses.find((s) => s.id === statusId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button">
          {current ? (
            <Badge
              className={cn("cursor-pointer text-foreground")}
              style={{ backgroundColor: current.color }}
            >
              {current.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="cursor-pointer text-muted-foreground">
              status
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {statuses.length === 0 && (
          <div className="max-w-56 px-2 py-1.5 text-xs text-muted-foreground">
            statusが未登録です。ツールバーの「status管理」から追加してください。
          </div>
        )}
        {statuses.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => onChange(s.id)}>
            {statusId === s.id ? <CheckIcon className="size-3.5" /> : <span className="size-3.5" />}
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onChange(null)}>
          {!statusId ? <CheckIcon className="size-3.5" /> : <span className="size-3.5" />}
          未設定
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
