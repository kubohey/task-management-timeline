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

  const handleExport = async () => {
    const text = buildObsidianTable(columns, rows);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Obsidian用の表をクリップボードにコピーしました");
    } catch {
      toast.error("クリップボードへのコピーに失敗しました");
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
          <PlusIcon />行
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleImport}>
          <ClipboardPasteIcon />
          Obsidianから貼り付け
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <ClipboardCopyIcon />
          Obsidianへコピー
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">データの取得に失敗しました。</p>
      ) : (
        <div className="max-h-80 max-w-full overflow-auto rounded-md border bg-background">
          <PhaseTable phaseId={phaseId} columns={columns} rows={rows} draggable />
        </div>
      )}
    </div>
  );
}
