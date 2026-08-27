"use client";

import { useEffect } from "react";
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

/**
 * メモ欄・備考セル共通のTiptapリッチテキストエディタ。
 * StarterKit（太字・箇条書き等）+ Highlight + TaskList/TaskItem（チェックリスト）。
 * docs/spec.md §2.3「メモ欄の操作性はObsidian相当（チェックボックス作成、箇条書き、
 * 太字、ハイライト）」
 */
export function RichTextEditor({ value, onChange, toolbar = false, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight, TaskList, TaskItem.configure({ nested: true })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
          className,
        ),
      },
    },
    onBlur: ({ editor: e }) => onChange(e.getJSON()),
  });

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
