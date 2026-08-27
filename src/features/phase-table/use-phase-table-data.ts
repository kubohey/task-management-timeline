"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchTableCells, fetchTableColumns, fetchTableRows } from "./api";
import type { CellValue, RowWithCells } from "./types";

/**
 * Phaseテーブルのcolumns/rows/cellsをまとめて取得する。呼び出し側（インライン表示/
 * ダイアログ表示）が表示中の間だけ`enabled`で取得・Realtime購読を有効化する。
 * columns/rowsはphase_idで絞り込んだRealtime購読、cellsはphase_idを持たないため
 * 無絞り込みで購読する。同じPhaseを複数箇所（インライン＋ダイアログ）で同時に開いても
 * 購読チャンネルが衝突しないよう、チャンネル名の一意化はuseRealtimeTable側で行う。
 */
export function usePhaseTableData(phaseId: string, enabled: boolean) {
  useRealtimeTable(
    "table_columns",
    ["tableColumns", phaseId],
    `phase_id=eq.${phaseId}`,
    enabled,
  );
  useRealtimeTable("table_rows", ["tableRows", phaseId], `phase_id=eq.${phaseId}`, enabled);
  useRealtimeTable("table_cells", ["tableCells", phaseId], undefined, enabled);

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
