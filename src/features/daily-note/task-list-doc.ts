import type { JSONContent } from "@tiptap/react";
import { emptyDoc } from "@/features/phase-table/types";
import { docToMarkdown } from "./obsidian-export";
import type { DailyTaskProjectGroup } from "./types";

function textContent(text: string): JSONContent[] {
  return text ? [{ type: "text", text }] : [];
}

/**
 * その日にカレンダー登録されているタスクを、ノート本文の初期値として挿入する
 * 入れ子リスト（プロジェクト名 → Phase名 → タスク名のチェックリスト）に変換する。
 *
 * これはノートがまだ一度も保存されていない（daily_notesに行が無い）ときの
 * 初期表示にのみ使う“雛形挿入”であり、一度保存された後はこの内容も含めて
 * 通常のノート本文として扱われる。以後タスク側（Phase表）が変更されても
 * 再挿入・再同期は行わない（docs/spec.md §2.5「デイリーノート内の編集は
 * Phase表と連動しない」）。
 */
export function buildDailyTaskListDoc(projects: DailyTaskProjectGroup[]): JSONContent {
  if (projects.length === 0) {
    return emptyDoc();
  }

  const projectItems: JSONContent[] = projects.map((project) => ({
    type: "listItem",
    content: [
      { type: "paragraph", content: textContent(project.projectName) },
      {
        type: "bulletList",
        content: project.phases.map(
          (phase): JSONContent => ({
            type: "listItem",
            content: [
              { type: "paragraph", content: textContent(phase.phaseName) },
              {
                type: "taskList",
                content: phase.tasks.map(
                  (task): JSONContent => ({
                    type: "taskItem",
                    attrs: { checked: task.checked },
                    content: [{ type: "paragraph", content: textContent(task.taskName) }],
                  }),
                ),
              },
            ],
          }),
        ),
      },
    ],
  }));

  return {
    type: "doc",
    content: [{ type: "bulletList", content: projectItems }, { type: "paragraph" }],
  };
}

/**
 * 本文が実質空（空段落のみ、あるいはノード自体が無い）かどうかを判定する。
 * RichTextEditorはフォーカスが外れるたびに（何も入力していなくても）自動保存するため、
 * 一度も文字を書かないままノートが作成されることがある。そうした空のノートは
 * 「一度も保存されていない」のと同じ扱いにして、タスクの雛形挿入を諦めないようにする。
 */
export function isBlankDoc(doc: JSONContent): boolean {
  const content = doc.content ?? [];
  return content.every((node) => node.type === "paragraph" && !node.content?.length);
}

export interface PreviewLine {
  text: string;
  checked?: boolean;
}

/**
 * 自由記述メモ（Tiptap doc）を、簡潔な行リストへ変換する。既存のMarkdown変換
 * （docToMarkdown）を再利用し、行頭の記法（`- `, `- [ ] `, `#`, `1. `等）だけ取り除いて
 * プレーンな箇条書き表示にする。outside吹き出し（timeline/outside-task-callouts.tsx）と
 * タスク検索の結果プレビュー（search/use-task-search.ts）の両方で使う共通ヘルパー。
 */
export function toPreviewLines(doc: JSONContent): PreviewLine[] {
  return docToMarkdown(doc)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const taskMatch = line.match(/^-\s\[([ x])\]\s(.*)$/);
      if (taskMatch) {
        return { text: taskMatch[2], checked: taskMatch[1] === "x" };
      }
      const match = line.match(/^(?:-|\d+\.|#+)\s(.*)$/);
      return { text: match ? match[1] : line };
    });
}
