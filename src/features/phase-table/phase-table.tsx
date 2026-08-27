"use client";

import { flexRender } from "@tanstack/react-table";
import { getCoreRowModel, useLegacyTable, type LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckboxCell } from "./cells/checkbox-cell";
import { SubtaskListCell } from "./cells/subtask-list-cell";
import { TextCell } from "./cells/text-cell";
import { useDeleteRow, useUpdateCell } from "./use-phase-table-mutations";
import type {
  CellValue,
  CheckboxCellValue,
  RowWithCells,
  SubtaskListCellValue,
  TableColumnRecord,
  TextCellValue,
} from "./types";

interface PhaseTableProps {
  phaseId: string;
  columns: TableColumnRecord[];
  rows: RowWithCells[];
}

const ACTIONS_COLUMN_ID = "__actions";

/**
 * Phase内タスク表の本体。TanStack Table（getCoreRowModelのみ）で描画する。
 * 列幅編集・列追加はMVP後回し（docs/spec.md §9）のため、列幅はDBの固定値をそのまま使う。
 */
export function PhaseTable({ phaseId, columns, rows }: PhaseTableProps) {
  const updateCell = useUpdateCell();
  const deleteRow = useDeleteRow();

  const columnDefs: LegacyColumnDef<RowWithCells>[] = [
    ...columns.map(
      (column): LegacyColumnDef<RowWithCells> => ({
        id: column.id,
        header: column.label,
        size: column.width,
        cell: ({ row }) => {
          const value = row.original.cells[column.id];
          const onChange = (next: CellValue) =>
            updateCell.mutate({
              rowId: row.original.row.id,
              columnId: column.id,
              value: next,
              phaseId,
            });

          switch (column.type) {
            case "checkbox":
              return (
                <CheckboxCell value={value as CheckboxCellValue | undefined} onChange={onChange} />
              );
            case "subtask_list":
              return (
                <SubtaskListCell
                  value={value as SubtaskListCellValue | undefined}
                  onChange={onChange}
                />
              );
            case "text":
            case "note_rich":
              return <TextCell value={value as TextCellValue | undefined} onChange={onChange} />;
          }
        },
      }),
    ),
    {
      id: ACTIONS_COLUMN_ID,
      header: "",
      size: 40,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="行を削除"
          onClick={() => {
            if (confirm("この行を削除しますか？")) {
              deleteRow.mutate({ id: row.original.row.id, phaseId });
            }
          }}
        >
          <Trash2Icon />
        </Button>
      ),
    },
  ];

  const table = useLegacyTable({
    data: rows,
    columns: columnDefs,
    getRowId: (row) => row.row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <colgroup>
        {table.getAllColumns().map((column) => (
          <col key={column.id} style={{ width: column.getSize() }} />
        ))}
      </colgroup>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnDefs.length} className="text-center text-muted-foreground">
              行がありません。「+ 行」から追加してください。
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="whitespace-normal align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
