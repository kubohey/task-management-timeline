"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchTableCells, fetchTableColumns, fetchTableRows } from "./api";
import type { CellValue, RowWithCells } from "./types";

/**
 * Phaseテーブルのcolumns/rows/cellsをまとめて取得する。ダイアログを開いている間だけ
 * 有効化される（`enabled`）。columns/rowsはphase_idで絞り込んだRealtime購読、
 * cellsはphase_idを持たないため無絞り込みで購読する（ダイアログのマウント中のみ）。
 */
export function usePhaseTableData(phaseId: string, enabled: boolean) {
  useRealtimeTable("table_columns", ["tableColumns", phaseId], `phase_id=eq.${phaseId}`);
  useRealtimeTable("table_rows", ["tableRows", phaseId], `phase_id=eq.${phaseId}`);
  useRealtimeTable("table_cells", ["tableCells", phaseId]);

  const columnsQuery = useQuery({
    queryKey: ["tableColumns", phaseId],
    queryFn: () => fetchTableColumns(phaseId),
    enabled,
  });
  const rowsQuery = useQuery({
    queryKey: ["tableRows", phaseId],
    queryFn: () => fetchTableRows(phaseId),
    enabled,
  });
  const rowIds = useMemo(() => (rowsQuery.data ?? []).map((r) => r.id), [rowsQuery.data]);
  const cellsQuery = useQuery({
    queryKey: ["tableCells", phaseId, rowIds],
    queryFn: () => fetchTableCells(rowIds),
    enabled: enabled && rowsQuery.isSuccess,
  });

  const columns = columnsQuery.data ?? [];

  const rowsWithCells: RowWithCells[] = useMemo(() => {
    const rows = rowsQuery.data ?? [];
    const cells = cellsQuery.data ?? [];
    const cellsByRow = new Map<string, Record<string, CellValue>>();
    for (const cell of cells) {
      const bucket = cellsByRow.get(cell.row_id) ?? {};
      bucket[cell.column_id] = cell.value;
      cellsByRow.set(cell.row_id, bucket);
    }
    return rows.map((row) => ({ row, cells: cellsByRow.get(row.id) ?? {} }));
  }, [rowsQuery.data, cellsQuery.data]);

  return {
    columns,
    rows: rowsWithCells,
    isLoading: columnsQuery.isLoading || rowsQuery.isLoading || cellsQuery.isLoading,
    isError: columnsQuery.isError || rowsQuery.isError || cellsQuery.isError,
  };
}
