"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import * as api from "./api";
import type { RoadmapColumnRecord } from "./types";

function useInvalidateColumns() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["roadmapColumns"] });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["roadmapTasks"] });
}

export function useCreateRoadmapColumn() {
  const invalidate = useInvalidateColumns();
  return useMutation({ mutationFn: api.insertRoadmapColumn, onSuccess: () => invalidate() });
}

/**
 * 列（幅・ラベル・サブ列数）の更新。楽観的更新なし＋onSuccessでの無効化だけだと、
 * 幅ドラッグ確定時にサーバー応答が返るまでの間キャッシュ上は古いwidthのままになり、
 * ドラッグ完了直後に一瞬（回線が遅いともっと長く）元の幅へ戻って見えた
 * （ユーザー報告：「引っ張ったら元の位置に戻ってしまう」）。useReorderPhasesと同じ
 * 楽観的更新パターンで、確定と同時にキャッシュ側も即座に書き換える。
 */
export function useUpdateRoadmapColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.RoadmapColumnPatch }) =>
      api.updateRoadmapColumn(vars.id, vars.patch),
    onMutate: async (vars) => {
      const queryKey: QueryKey = ["roadmapColumns"];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RoadmapColumnRecord[]>(queryKey);
      if (previous) {
        queryClient.setQueryData(
          queryKey,
          previous.map((column) =>
            column.id === vars.id ? { ...column, ...vars.patch } : column,
          ),
        );
      }
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["roadmapColumns"] });
    },
  });
}

/**
 * Project列のドラッグ並び替え。楽観的更新でroadmapColumnsキャッシュのsort_orderを
 * 即座に並び替え、ドロップ直後にサーバー応答を待たず画面上の順序を確定させる
 * （hierarchy/use-hierarchy-mutations.tsのuseReorderPhasesと同じ方式）。
 * ユーザー要望：「ロードマップのページで、各プロジェクトの列をドラッグして、
 * 並び替えられるようにしてほしい」
 */
export function useReorderRoadmapColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedColumnIds: string[]) => api.reorderRoadmapColumns(orderedColumnIds),
    onMutate: async (orderedColumnIds) => {
      const queryKey: QueryKey = ["roadmapColumns"];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RoadmapColumnRecord[]>(queryKey);
      if (previous) {
        const orderById = new Map(orderedColumnIds.map((id, index) => [id, index]));
        const next = previous
          .map((column) => {
            const nextOrder = orderById.get(column.id);
            return nextOrder === undefined ? column : { ...column, sort_order: nextOrder };
          })
          .sort((a, b) => a.sort_order - b.sort_order);
        queryClient.setQueryData(queryKey, next);
      }
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["roadmapColumns"] });
    },
  });
}

export function useDeleteRoadmapColumn() {
  const invalidate = useInvalidateColumns();
  const invalidateTasks = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.deleteRoadmapColumn(id),
    onSuccess: () => {
      invalidate();
      // 列を削除するとDB側でroadmap_tasksもCASCADE削除されるため、あわせて無効化する。
      invalidateTasks();
    },
  });
}

export function useCreateRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: api.insertRoadmapTask, onSuccess: () => invalidate() });
}

export function useUpdateRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.RoadmapTaskPatch }) =>
      api.updateRoadmapTask(vars.id, vars.patch),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.deleteRoadmapTask(id), onSuccess: () => invalidate() });
}
