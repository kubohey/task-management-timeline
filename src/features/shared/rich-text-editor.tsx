"use client";

import { useEffect, useRef } from "react";
import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, HighlighterIcon, ListChecksIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: JSONContent;
  onChange: (doc: JSONContent) => void;
  /** trueのとき太字・箇条書き・チェックリスト・ハイライトのツールバーを表示する。 */
  toolbar?: boolean;
  className?: string;
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-xs"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

const AUTOSAVE_DELAY_MS = 600;

/**
 * メモ欄・備考セル共通のTiptapリッチテキストエディタ。
 * StarterKit（太字・箇条書き等）+ Highlight + TaskList/TaskItem（チェックリスト）。
 * docs/spec.md §2.3「メモ欄の操作性はObsidian相当（チェックボックス作成、箇条書き、
 * 太字、ハイライト）」
 *
 * 保存は入力停止後の自動保存（デバウンス）＋blur時・アンマウント時の即時flush。
 * メモ欄（ポップオーバー）はクリック外や別タスククリックで即座にアンマウントされるため、
 * blurのみに頼ると入力直後の編集が保存されないことがあるための対策。
 */
export function RichTextEditor({ value, onChange, toolbar = false, className }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = (doc: JSONContent) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      onChangeRef.current(doc);
    }, AUTOSAVE_DELAY_MS);
  };

  const flush = (doc: JSONContent) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    onChangeRef.current(doc);
  };

  const editor = useEditor({
    extensions: [StarterKit, Highlight, TaskList, TaskItem.configure({ nested: true })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          // Tailwindのpreflightがul/olのlist-styleをリセットするため、
          // typographyプラグインなしで箇条書き・番号リストのマーカーを明示的に復元する。
          "text-sm focus:outline-none",
          "[&_ol]:list-decimal [&_ol]:py-1 [&_ol]:pl-6",
          "[&_p]:py-0.5",
          "[&_ul:not([data-type=taskList])]:list-disc [&_ul:not([data-type=taskList])]:py-1 [&_ul:not([data-type=taskList])]:pl-6",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
          "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-1.5",
          "[&_ul[data-type=taskList]_p]:py-0",
          className,
        ),
      },
    },
    onUpdate: ({ editor: e }) => scheduleSave(e.getJSON()),
    onBlur: ({ editor: e }) => flush(e.getJSON()),
  });

  // アンマウント時（ポップオーバーが閉じた等）に未保存の変更が残っていればflushする。
  useEffect(() => {
    return () => {
      if (debounceTimer.current && editor) {
        clearTimeout(debounceTimer.current);
        onChangeRef.current(editor.getJSON());
      }
    };
  }, [editor]);

  // 他デバイス/画面での編集がRealtimeで届いた場合、フォーカス中でなければ反映する
  // （入力中のカーソル・未確定の編集を上書きしないため）。
  useEffect(() => {
    if (!editor || editor.isFocused) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div>
      {toolbar && (
        <div className="mb-1.5 flex items-center gap-0.5 border-b pb-1.5">
          <ToolbarButton
            active={editor.isActive("bold")}
            title="太字"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            title="箇条書き"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <ListIcon />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("taskList")}
            title="チェックリスト"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecksIcon />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("highlight")}
            title="ハイライト"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <HighlighterIcon />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
