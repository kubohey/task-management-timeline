"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PhaseStatusRecord } from "./types";

const PhaseStatusesContext = createContext<PhaseStatusRecord[] | null>(null);

/**
 * ユーザーが定義したPhase statusの一覧をcontext経由で配る。
 * StatusSelect（Phase行のstatus選択）、PhaseStatusFilter（絞り込み）、
 * ProjectRow（statusソート）など複数箇所で必要になるため、
 * Group/Project経由のバケツリレーを避ける。docs/spec.md §2.1
 */
export function PhaseStatusesProvider({
  statuses,
  children,
}: {
  statuses: PhaseStatusRecord[];
  children: ReactNode;
}) {
  return <PhaseStatusesContext value={statuses}>{children}</PhaseStatusesContext>;
}

export function usePhaseStatuses(): PhaseStatusRecord[] {
  const value = useContext(PhaseStatusesContext);
  if (!value) {
    throw new Error("usePhaseStatuses must be used within a PhaseStatusesProvider");
  }
  return value;
}
