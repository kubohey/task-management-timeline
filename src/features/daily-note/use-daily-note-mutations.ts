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

/**
 * ノートのタグ一覧（今のところ「outside」のみ）を保存する。ガントチャート側の
 * 塗りつぶし判定に使う`["outsideDates"]`もあわせてinvalidateする。
 */
export function useSetDailyNoteTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; date: string; tags: string[] }) =>
      api.setDailyNoteTags(vars),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["dailyNote", vars.date] });
      void queryClient.invalidateQueries({ queryKey: ["outsideDates"] });
    },
  });
}

/**
 * outside専用メモ欄（本文とは別のTiptap doc、autosave経由で呼ばれる）を保存する。
 * カレンダーの日付ヘッダー上の吹き出しが参照する`["outsideContentNotes"]`もあわせて
 * invalidateする。
 */
export function useSaveOutsideNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; date: string; content: JSONContent }) =>
      api.setOutsideContent(vars),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["dailyNote", vars.date] });
      void queryClient.invalidateQueries({ queryKey: ["outsideContentNotes"] });
    },
  });
}
