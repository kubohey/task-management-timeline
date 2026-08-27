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
  const invalidate = useInvalidateTable();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string }) => api.deleteTableRow(vars.id),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
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
