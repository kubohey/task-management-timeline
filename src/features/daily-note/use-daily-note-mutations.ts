"use client";

import type { JSONContent } from "@tiptap/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertTableCell } from "@/features/phase-table/api";
import * as api from "./api";

/** ノート本文の保存（日付ごとに1件、autosave経由で呼ばれる）。 */
export function useSaveDailyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; date: string; content: JSONContent }) =>
      api.upsertDailyNote(vars),
    onSuccess: (_data, vars) =>
      void queryClient.invalidateQueries({ queryKey: ["dailyNote", vars.date] }),
  });
}

/**
 * 自動生成されたタスク一覧のチェックボックスをトグルする。Phase表の既存セルを
 * 直接更新するため、Phase表側にもそのまま反映される（実体を複製しない方針、docs/spec.md §5）。
 */
export function useToggleDailyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      rowId: string;
      columnId: string;
      checked: boolean;
      date: string;
      phaseId: string;
    }) => upsertTableCell({ rowId: vars.rowId, columnId: vars.columnId, value: { checked: vars.checked } }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["dailyTasks", vars.date] });
      // Phase表側（開いていれば）のキャッシュもuse-phase-table-mutations.tsと同様に即時無効化する。
      void queryClient.invalidateQueries({ queryKey: ["tableCells", vars.phaseId] });
    },
  });
}
