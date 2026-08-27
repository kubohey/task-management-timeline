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
import type { PhaseStatus } from "./types";

export const STATUS_LABELS: Record<PhaseStatus, string> = {
  active: "active",
  always: "always",
  next: "next",
};

export const STATUS_STYLES: Record<PhaseStatus, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  always: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  next: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

/** statusソート時の並び順（active → next → always、未設定は最後）。 */
export const STATUS_SORT_ORDER: Record<string, number> = {
  active: 0,
  next: 1,
  always: 2,
};

interface StatusSelectProps {
  status: PhaseStatus | null;
  onChange: (status: PhaseStatus | null) => void;
}

/** Phaseのstatus（active/always/next）を付与・変更するドロップダウン。 */
export function StatusSelect({ status, onChange }: StatusSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button">
          {status ? (
            <Badge className={cn("cursor-pointer", STATUS_STYLES[status])}>
              {STATUS_LABELS[status]}
            </Badge>
          ) : (
            <Badge variant="outline" className="cursor-pointer text-muted-foreground">
              status
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(STATUS_LABELS) as PhaseStatus[]).map((key) => (
          <DropdownMenuItem key={key} onSelect={() => onChange(key)}>
            {status === key ? <CheckIcon className="size-3.5" /> : <span className="size-3.5" />}
            {STATUS_LABELS[key]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onChange(null)}>
          {!status ? <CheckIcon className="size-3.5" /> : <span className="size-3.5" />}
          未設定
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
