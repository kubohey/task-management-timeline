import type { JSONContent } from "@tiptap/react";
import type { DailyTaskProjectGroup } from "./types";

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

/** ノート本文（Tiptap doc）をObsidian互換のMarkdownに変換する。 */
export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? []).flatMap((node) => blockToLines(node, 0)).join("\n");
}

/**
 * その日のタスク一覧を「プロジェクト名 > Phase名 > タスク名（チェックボックス）」の
 * 階層Markdownに変換する。
 */
export function buildDailyTasksMarkdown(projects: DailyTaskProjectGroup[]): string {
  return projects
    .flatMap((project) => [
      `- ${project.projectName}`,
      ...project.phases.flatMap((phase) => [
        `${INDENT}- ${phase.phaseName}`,
        ...phase.tasks.map(
          (task) => `${INDENT.repeat(2)}- [${task.checked ? "x" : " "}] ${task.taskName}`,
        ),
      ]),
    ])
    .join("\n");
}

/**
 * デイリータスクノート全体（自動生成のタスク階層＋自由記述メモ）をひとつの
 * Markdown文字列にまとめる。Obsidianへそのまま貼り付けるとチェックボックスが機能する。
 */
export function buildDailyNoteMarkdown(projects: DailyTaskProjectGroup[], noteDoc: JSONContent): string {
  const taskSection = buildDailyTasksMarkdown(projects);
  const noteSection = docToMarkdown(noteDoc);
  return [taskSection, noteSection].filter((section) => section.length > 0).join("\n\n");
}
