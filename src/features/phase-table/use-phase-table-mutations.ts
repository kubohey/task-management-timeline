"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import * as api from "./api";
import type { TableRowRecord } from "./types";

/** 行・セルの変更後にキャッシュを無効化する共通処理。 */
function useInvalidateTable() {
  const queryClient = useQueryClient();
  return (phaseId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["tableRows", phaseId] });
    void queryClient.invalidateQueries({ queryKey: ["tableCells", phaseId] });
  };
}

export function useCreateRow() {
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: api.insertTableRow,
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

export function useDeleteRow() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string }) => api.deleteTableRow(vars.id),
    onSuccess: (_data, vars) => {
      invalidate(vars.phaseId);
      // 行を削除するとDB側でtask_placementsもCASCADE削除されるため、
      // タイムライン側のチップが消えるようキャッシュも無効化する。
      void queryClient.invalidateQueries({ queryKey: ["taskPlacements", vars.phaseId] });
    },
  });
}

/**
 * 行のドラッグ並び替え。楽観的更新でtableRowsキャッシュを即座に並び替え、
 * ドロップ直後にサーバーの応答を待たず画面上の順序を確定させる
 * （ドラッグ中はdnd-kit側のtransformで見た目だけ動かしており、実データはここで初めて動く）。
 */
export function useReorderRows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { phaseId: string; orderedRowIds: string[] }) =>
      api.reorderTableRows({ orderedRowIds: vars.orderedRowIds }),
    onMutate: async (vars) => {
      const queryKey: QueryKey = ["tableRows", vars.phaseId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TableRowRecord[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((row) => [row.id, row]));
        const next = vars.orderedRowIds
          .map((id, index) => {
            const row = byId.get(id);
            return row ? { ...row, sort_order: index } : undefined;
          })
          .filter((row): row is TableRowRecord => row !== undefined);
        queryClient.setQueryData(queryKey, next);
      }
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tableRows", vars.phaseId] });
    },
  });
}

export function useUpdateCell() {
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: (vars: Parameters<typeof api.upsertTableCell>[0] & { phaseId: string }) =>
      api.upsertTableCell(vars),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

export function useImportObsidianRows() {
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: api.importObsidianRows,
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string; patch: api.TableColumnPatch }) =>
      api.updateTableColumn(vars.id, vars.patch),
    onSuccess: (_data, vars) =>
      void queryClient.invalidateQueries({ queryKey: ["tableColumns", vars.phaseId] }),
  });
}

export function useCreateColumn() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: api.createTableColumn,
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tableColumns", vars.phaseId] });
      invalidate(vars.phaseId);
    },
  });
}

export function useDeleteColumn() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string }) => api.deleteTableColumn(vars.id),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tableColumns", vars.phaseId] });
      invalidate(vars.phaseId);
    },
  });
}
