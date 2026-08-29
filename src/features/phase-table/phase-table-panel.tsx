"use client";

import { ClipboardCopyIcon, ClipboardPasteIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildObsidianTable } from "./obsidian-export";
import { parseObsidianTable } from "./obsidian-import";
import { PhaseTable } from "./phase-table";
import type { RowWithCells, TableColumnRecord } from "./types";
import { useCreateRow, useImportObsidianRows } from "./use-phase-table-mutations";

interface PhaseTablePanelProps {
  phaseId: string;
  columns: TableColumnRecord[];
  rows: RowWithCells[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Phase内タスク表を、タイムライン上のPhase行の直下にインライン表示するパネル。
 * モーダルで覆ってしまうとカレンダー（タイムライン）と並べて見られないため、
 * ページ内展開にしている。データはPhaseRowが常時取得したものをpropsで受け取る
 * （タイムラインのチップ表示にも同じデータが必要なため）。
 * docs/spec.md §2.1「Phaseには Table 表示があり、タスク一覧表を開ける」
 */
export function PhaseTablePanel({
  phaseId,
  columns,
  rows,
  isLoading,
  isError,
}: PhaseTablePanelProps) {
  const createRow = useCreateRow();
  const importRows = useImportObsidianRows();

  const handleImport = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error("Couldn't read the clipboard");
      return;
    }
    const parsed = parseObsidianTable(text);
    if (parsed.length === 0) {
      toast("No Markdown table found on the clipboard");
      return;
    }
    importRows.mutate({ phaseId, columns, parsedRows: parsed, baseSortOrder: rows.length });
  };

  const handleExport = async () => {
    const text = buildObsidianTable(columns, rows);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied the table for Obsidian to the clipboard");
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  return (
    <div className="border-b bg-muted/20 py-2">
      <div className="mb-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={columns.length === 0}
          onClick={() => createRow.mutate({ phaseId, columns, sortOrder: rows.length })}
        >
          <PlusIcon />Row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleImport}>
          <ClipboardPasteIcon />
          Paste from Obsidian
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <ClipboardCopyIcon />
          Copy for Obsidian
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load data.</p>
      ) : (
        <div className="max-h-80 max-w-full overflow-auto rounded-md border bg-background">
          <PhaseTable phaseId={phaseId} columns={columns} rows={rows} draggable />
        </div>
      )}
    </div>
  );
}
