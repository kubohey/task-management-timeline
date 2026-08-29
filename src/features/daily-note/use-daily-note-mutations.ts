"use client";

import type { JSONContent } from "@tiptap/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

/**
 * ノート本文の保存（日付ごとに1件、autosave経由で呼ばれる）。
 * 初回作成時に挿入されたタスクの雛形（task-list-doc.ts）を含め、doc全体をそのまま保存する。
 * 以後この内容はPhase表と独立しており、タスク側の変更でここが上書きされることはない
 * （docs/spec.md §2.5）。
 */
export function useSaveDailyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; date: string; content: JSONContent }) =>
      api.upsertDailyNote(vars),
    onSuccess: (_data, vars) =>
      void queryClient.invalidateQueries({ queryKey: ["dailyNote", vars.date] }),
  });
}
