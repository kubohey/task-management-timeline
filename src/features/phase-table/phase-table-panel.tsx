"use client";

import { useEffect, useRef } from "react";
import { ClipboardCopyIcon, ClipboardPasteIcon, MoveDiagonalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
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
 * Phase内タスク表を、タイムライン上のPhase行の直下にPopoverオーバーレイとして
 * 表示するパネル。データはPhaseRowが常時取得したものをpropsで受け取る
 * （タイムラインのチップ表示にも同じデータが必要なため）。
 * docs/spec.md §2.1「Phaseには Table 表示があり、タスク一覧表を開ける」
 *
 * 右下の隅をドラッグして表示サイズ（幅・高さ）を自由に変更できる
 * （ユーザー要望：「表の表示サイズを自分で調整できるようにして」）。
 * 幅はui-store経由でPhaseRow側のPopoverContentの幅にも反映される
 * （全Phase共通の設定として扱う。localStorageに永続化）。
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
  const width = useUiStore((s) => s.taskTablePanelWidth);
  const height = useUiStore((s) => s.taskTablePanelHeight);
  const setSize = useUiStore((s) => s.setTaskTablePanelSize);
  const sizeRef = useRef({ width, height });
  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { width: startWidth, height: startHeight } = sizeRef.current;

    const handleMove = (moveEvent: PointerEvent) => {
      setSize({
        width: startWidth + (moveEvent.clientX - startX),
        height: startHeight + (moveEvent.clientY - startY),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

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
    <div className="relative border-b bg-muted/20 py-2">
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
        <div className="max-w-full overflow-auto rounded-md border bg-background" style={{ height }}>
          <PhaseTable phaseId={phaseId} columns={columns} rows={rows} draggable />
        </div>
      )}
      <div
        onPointerDown={startResize}
        title="ドラッグして表の表示サイズを変更"
        className="absolute right-0 bottom-0 z-10 flex size-4 touch-none items-end justify-end pr-0.5 pb-0.5 text-muted-foreground/60 hover:text-foreground"
        style={{ cursor: "nwse-resize" }}
      >
        <MoveDiagonalIcon className="size-3" />
      </div>
    </div>
  );
}
