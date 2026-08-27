"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

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
