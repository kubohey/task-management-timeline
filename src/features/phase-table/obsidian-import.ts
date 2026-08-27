import { toString as mdastToString } from "mdast-util-to-string";
import type { Root, Table, TableCell, TableRow } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { SubtaskItem } from "./types";

export interface ParsedObsidianRow {
  checked: boolean;
  taskName: string;
  note: string;
  subtasks: SubtaskItem[];
}

const processor = unified().use(remarkParse).use(remarkGfm);

function findFirstTable(root: Root): Table | undefined {
  return root.children.find((child): child is Table => child.type === "table");
}

/**
 * セル内の改行はGFM表内では<br>（生のHTML）として表現されるため、実際の改行文字に戻す。
 * タスク名・備考欄はtextareaで表示するため、これで見た目通りの複数行になる。
 */
function normalizeCellBreaks(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

function cellText(cell: TableCell | undefined): string {
  return cell ? normalizeCellBreaks(mdastToString(cell)).trim() : "";
}

const SUBTASK_LINE_RE = /^-?\s*\[( |x|X)\]\s*(.*)$/;

/**
 * サブタスクセルの中身をsubtask項目一覧に分解する。
 * `- [ ] label` / `- [x] label` 形式の行をsubtask化し、形式に合わない行は
 * 未チェックのsubtaskとしてそのまま扱う。docs/spec.md §2.2
 */
function parseSubtasks(rawText: string): SubtaskItem[] {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = SUBTASK_LINE_RE.exec(line);
      if (match) {
        return { label: match[2].trim(), checked: match[1].toLowerCase() === "x" };
      }
      return { label: line, checked: false };
    });
}

/**
 * ObsidianからコピーしたMarkdown表（GFM pipe table）をパースする。
 * 列の並びは貼り付け先のPhaseテーブルの4列（チェックボックス/タスク名/備考/サブタスク）に
 * 位置で対応させる。5列目以降は無視し、4列に満たない場合は空で扱う。docs/spec.md §2.2
 */
export function parseObsidianTable(markdown: string): ParsedObsidianRow[] {
  const tree = processor.parse(markdown) as Root;
  const table = findFirstTable(tree);
  if (!table) {
    return [];
  }

  const [, ...dataRows] = table.children as TableRow[];
  return dataRows.map((row) => {
    const cells = row.children as TableCell[];
    const checkboxText = cellText(cells[0]);
    return {
      checked: /\[x\]/i.test(checkboxText),
      taskName: cellText(cells[1]),
      note: cellText(cells[2]),
      subtasks: parseSubtasks(cellText(cells[3])),
    };
  });
}
