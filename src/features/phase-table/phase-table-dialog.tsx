"use client";

import { ClipboardCopyIcon, ClipboardPasteIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildObsidianTable } from "./obsidian-export";
import { parseObsidianTable } from "./obsidian-import";
import { PhaseTable } from "./phase-table";
import type { RowWithCells, TableColumnRecord } from "./types";
import { useCreateRow, useImportObsidianRows } from "./use-phase-table-mutations";

interface PhaseTableDialogProps {
  phaseId: string;
  phaseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: TableColumnRecord[];
  rows: RowWithCells[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Phase内タスク表をダイアログで開く。データはPhaseRowが常時取得したものをpropsで
 * 受け取る（インライン表示と共有、二重取得を避ける）。モーダルの裏はタイムラインが
 * 隠れて実用上ドラッグ先が見えないため、ドラッグハンドルはここでは表示しない。
 * docs/spec.md §2.1「Phaseには Table 表示があり、タスク一覧表を開ける」
 */
export function PhaseTableDialog({
  phaseId,
  phaseName,
  open,
  onOpenChange,
  columns,
  rows,
  isLoading,
  isError,
}: PhaseTableDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{phaseName} task table</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
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
        <div className="max-h-[70vh] overflow-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">Failed to load data.</p>
          ) : (
            <PhaseTable phaseId={phaseId} columns={columns} rows={rows} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
