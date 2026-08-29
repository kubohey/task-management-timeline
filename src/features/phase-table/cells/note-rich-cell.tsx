"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "@/features/shared/rich-text-editor";
import { cn } from "@/lib/utils";
import { emptyDoc, type NoteRichCellValue } from "../types";

interface NoteRichCellProps {
  value: NoteRichCellValue | undefined;
  onChange: (value: NoteRichCellValue) => void;
}

const BLOCK_NODE_TYPES = new Set(["paragraph", "listItem", "taskItem", "heading"]);

/**
 * JSONContentドキュメントからプレビュー表示用の素のテキストだけを抜き出す。
 * 段落・リスト項目のまとまりごとに改行を入れ、複数行の備考でも（太字などの
 * 装飾は失うが）内容自体は元のエディタ表示と同じく複数行で見えるようにする。
 */
function docToPlainText(node: JSONContent): string {
  const parts: string[] = node.text ? [node.text] : [];
  for (const child of node.content ?? []) {
    parts.push(docToPlainText(child));
  }
  const joined = parts.join("");
  return BLOCK_NODE_TYPES.has(node.type ?? "") ? `${joined}\n` : joined;
}

/**
 * 表セル内のコンパクトな備考エディタ（ツールバーなし）。フル操作はメモ欄で行う。
 *
 * Tiptapエディタの生成コストは軽くなく、Phase表を開いた瞬間に全行分の備考セルで
 * 一斉にエディタが作られると、表示がもたついて見える（ユーザー報告：「表の読み込みが
 * 遅い」「Phase表（⊞ボタン）を開いた瞬間」）。行数分のTiptapインスタンスを常に
 * マウントしておく必要はなく、実際に触るセルだけあれば十分なため、クリック/フォーカス
 * するまでは軽量なプレーンテキストのプレビューだけを描画し、エディタは遅延生成する。
 */
export function NoteRichCell({ value, onChange }: NoteRichCellProps) {
  const doc = value?.doc ?? emptyDoc();
  const [editing, setEditing] = useState(false);

  if (!editing) {
    const preview = docToPlainText(doc).trim();
    return (
      <div
        role="textbox"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
        className={cn(
          "min-h-[1.5em] cursor-text rounded-sm px-1 py-0.5 text-sm whitespace-pre-wrap outline-none",
          "hover:bg-accent/30",
          !preview && "text-muted-foreground",
        )}
      >
        {preview || "備考を入力"}
      </div>
    );
  }

  return (
    // フォーカスが外れたらプレビュー表示に戻す（RichTextEditorはonBlurを外へ
    // 公開していないため、この外側divでフォーカスアウトを拾う）。未保存の変更は
    // RichTextEditor側のonBlur（即時flush）・アンマウント時クリーンアップの
    // 二重の仕組みで保存済みになるため、ここで取りこぼすことはない。
    <div onBlur={() => setEditing(false)}>
      <RichTextEditor
        value={doc}
        onChange={(nextDoc) => onChange({ doc: nextDoc })}
        className="min-h-[1.5em] text-sm"
        autoFocus
      />
    </div>
  );
}
