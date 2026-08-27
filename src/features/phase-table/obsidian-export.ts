import type { JSONContent } from "@tiptap/react";
import type {
  CellValue,
  CheckboxCellValue,
  NoteRichCellValue,
  RowWithCells,
  SubtaskListCellValue,
  TableColumnRecord,
  TextCellValue,
} from "./types";

/** 表セルとして壊れないよう、`|`のエスケープと改行の統一を行う。 */
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

/** テキストノードをmarks（太字・ハイライト）付きでプレーンテキスト化する。 */
function inlineText(node: JSONContent): string {
  if (node.type === "text") {
    let text = node.text ?? "";
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === "bold")) {
      text = `**${text}**`;
    }
    if (marks.some((m) => m.type === "highlight")) {
      text = `==${text}==`;
    }
    return text;
  }
  return (node.content ?? []).map(inlineText).join("");
}

function listItemText(item: JSONContent): string {
  return (item.content ?? [])
    .flatMap((block) => (block.content ?? []).map(inlineText))
    .join("");
}

/**
 * Tiptapのdocを行の配列にする。段落はそのまま1行、箇条書き・チェックリストの各項目は
 * `・`始まりの行に変換する（Obsidianの表セル内ではリストやチェックボックスをブロック要素
 * として描画できないため）。docs/spec.md §2.2
 */
function docToLines(doc: JSONContent): string[] {
  const lines: string[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === "paragraph") {
      const text = (node.content ?? []).map(inlineText).join("");
      if (text) {
        lines.push(text);
      }
    } else if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
      for (const item of node.content ?? []) {
        lines.push(`・${listItemText(item)}`);
      }
    }
  }
  return lines;
}

function serializeCell(column: TableColumnRecord, value: CellValue | undefined): string {
  switch (column.type) {
    case "checkbox":
      return (value as CheckboxCellValue | undefined)?.checked ? "[x]" : "[ ]";
    case "text":
      return escapeCell((value as TextCellValue | undefined)?.text ?? "");
    case "note_rich": {
      const doc = (value as NoteRichCellValue | undefined)?.doc;
      return escapeCell(doc ? docToLines(doc).join("<br>") : "");
    }
    case "subtask_list": {
      const items = (value as SubtaskListCellValue | undefined)?.items ?? [];
      return escapeCell(items.map((item) => `・${item.label}`).join("<br>"));
    }
  }
}

/**
 * Phaseテーブルの内容をObsidian形式（GFM pipe table）のMarkdown文字列に変換する。
 * サブタスク・備考欄の箇条書き/チェックリストは`・`始まりのプレーンテキストに変換する
 * （docs/spec.md §2.2「コピー時に`・`へ変換する」）。列は現在の`label`を見出しに使うため、
 * 列の追加・リネームに追従する。
 */
export function buildObsidianTable(columns: TableColumnRecord[], rows: RowWithCells[]): string {
  const header = `| ${columns.map((c) => c.label || " ").join(" | ")} |`;
  const separator = `|${columns.map(() => " --- ").join("|")}|`;
  const body = rows.map(
    (row) => `| ${columns.map((c) => serializeCell(c, row.cells[c.id])).join(" | ")} |`,
  );
  return [header, separator, ...body].join("\n");
}
