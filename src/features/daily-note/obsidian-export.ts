import type { JSONContent } from "@tiptap/react";

const INDENT = "    ";

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

/** リスト項目・タスク項目の1行目（本文）を取り出す。 */
function firstLineText(content: JSONContent[]): string {
  const [first] = content;
  return first ? (first.content ?? []).map(inlineText).join("") : "";
}

/**
 * Tiptapのdocノード1件をMarkdown行（配列）に変換する。箇条書き・番号付き・チェックリストは
 * ネストしたリスト（TaskItemのnested:true）も再帰的に辿り、depthに応じてインデントする。
 * 表セル内埋め込み用のphase-table/obsidian-export.tsとは異なり、ここはObsidianの
 * ノート本文としてそのまま貼り付ける前提のため、`- [ ]`をプレーンテキスト化せず実チェック
 * ボックスとして書き出す。
 */
function blockToLines(node: JSONContent, depth: number): string[] {
  const indent = INDENT.repeat(depth);
  switch (node.type) {
    case "paragraph": {
      const text = (node.content ?? []).map(inlineText).join("");
      return text ? [`${indent}${text}`] : [];
    }
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const text = (node.content ?? []).map(inlineText).join("");
      return text ? [`${indent}${"#".repeat(level)} ${text}`] : [];
    }
    case "bulletList":
      return (node.content ?? []).flatMap((item) => listItemToLines(item, depth, "-"));
    case "orderedList": {
      let i = 1;
      return (node.content ?? []).flatMap((item) => listItemToLines(item, depth, `${i++}.`));
    }
    case "taskList":
      return (node.content ?? []).flatMap((item) => taskItemToLines(item, depth));
    default: {
      // 未対応のノード種別（コードブロック等）はプレーンテキストとして落とし込む。
      const text = inlineText(node);
      return text ? [`${indent}${text}`] : [];
    }
  }
}

function listItemToLines(item: JSONContent, depth: number, marker: string): string[] {
  const content = item.content ?? [];
  const text = firstLineText(content);
  const lines = [`${INDENT.repeat(depth)}${marker} ${text}`];
  for (const child of content.slice(1)) {
    lines.push(...blockToLines(child, depth + 1));
  }
  return lines;
}

function taskItemToLines(item: JSONContent, depth: number): string[] {
  const checked = item.attrs?.checked ? "x" : " ";
  const content = item.content ?? [];
  const text = firstLineText(content);
  const lines = [`${INDENT.repeat(depth)}- [${checked}] ${text}`];
  for (const child of content.slice(1)) {
    lines.push(...blockToLines(child, depth + 1));
  }
  return lines;
}

/**
 * ノート本文（Tiptap doc）をObsidian互換のMarkdownに変換する。タスク一覧（プロジェクト名
 * → Phase名 → タスク名のチェックリスト）も、初回作成時に本文へ挿入された通常のリストとして
 * ここで一緒に変換される（docs/spec.md §2.5）。
 */
export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? []).flatMap((node) => blockToLines(node, 0)).join("\n");
}
