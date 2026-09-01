"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import * as api from "./api";
import type { TaskPlacementRecord } from "./types";

function useInvalidatePlacements() {
  const queryClient = useQueryClient();
  return (phaseId: string) =>
    void queryClient.invalidateQueries({ queryKey: ["taskPlacements", phaseId] });
}

export function useCreatePlacement() {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (vars: { sourceRowId: string; date: string; phaseId: string }) =>
      api.insertTaskPlacement(vars),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

/**
 * タイムライン上での手動追加。Phase表の行の作成・セル作成も伴うため、
 * taskPlacementsに加えてtableRows/tableCellsのキャッシュも無効化する。
 */
export function useCreatePlacementWithNewRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPlacementWithNewRow,
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["taskPlacements", vars.phaseId] });
      void queryClient.invalidateQueries({ queryKey: ["tableRows", vars.phaseId] });
      void queryClient.invalidateQueries({ queryKey: ["tableCells", vars.phaseId] });
    },
  });
}

export function useDeletePlacement() {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string }) => api.deleteTaskPlacement(vars.id),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

/**
 * 予定の日付範囲の更新（タイムライン上のドラッグリサイズ）。楽観的更新でtaskPlacements
 * キャッシュを即座に書き換え、サーバー応答を待たずに確定させる（ユーザー報告：
 * 「スライドすると一度もとの状態に戻った後、数秒のタイムラグの後、スライドした
 * 位置に変更される」。以前はonSuccessでのinvalidateだけだったため、ドラッグ終了時に
 * ローカルのプレビュー位置がリセットされてから、サーバー応答＋再取得が終わるまでの
 * 間、古い（元の）位置がそのまま表示されていた）。
 */
export function useUpdatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string; patch: api.TaskPlacementPatch }) =>
      api.updateTaskPlacement(vars.id, vars.patch),
    onMutate: async (vars) => {
      const queryKey: QueryKey = ["taskPlacements", vars.phaseId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskPlacementRecord[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<TaskPlacementRecord[]>(
          queryKey,
          previous.map((p) => (p.id === vars.id ? { ...p, ...vars.patch } : p)),
        );
      }
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, vars) =>
      void queryClient.invalidateQueries({ queryKey: ["taskPlacements", vars.phaseId] }),
  });
}
