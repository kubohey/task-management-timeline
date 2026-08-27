"use client";

import { ClipboardPasteIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseObsidianTable } from "./obsidian-import";
import { PhaseTable } from "./phase-table";
import { usePhaseTableData } from "./use-phase-table-data";
import { useCreateRow, useImportObsidianRows } from "./use-phase-table-mutations";

interface PhaseTableDialogProps {
  phaseId: string;
  phaseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Phase内タスク表をダイアログで開く。
 * docs/spec.md §2.1「Phaseには Table 表示があり、タスク一覧表を開ける」
 */
export function PhaseTableDialog({
  phaseId,
  phaseName,
  open,
  onOpenChange,
}: PhaseTableDialogProps) {
  const { columns, rows, isLoading, isError } = usePhaseTableData(phaseId, open);
  const createRow = useCreateRow();
  const importRows = useImportObsidianRows();

  const handleImport = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error("クリップボードを読み取れませんでした");
      return;
    }
    const parsed = parseObsidianTable(text);
    if (parsed.length === 0) {
      toast("クリップボードにMarkdown表が見つかりませんでした");
      return;
    }
    importRows.mutate({ phaseId, columns, parsedRows: parsed, baseSortOrder: rows.length });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{phaseName} のタスク表</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={columns.length === 0}
            onClick={() => createRow.mutate({ phaseId, columns, sortOrder: rows.length })}
          >
            <PlusIcon />行
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleImport}>
            <ClipboardPasteIcon />
            Obsidianから貼り付け
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">読み込み中...</p>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">データの取得に失敗しました。</p>
          ) : (
            <PhaseTable phaseId={phaseId} columns={columns} rows={rows} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
