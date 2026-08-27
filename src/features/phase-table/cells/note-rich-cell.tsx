"use client";

import { RichTextEditor } from "@/features/shared/rich-text-editor";
import { emptyDoc, type NoteRichCellValue } from "../types";

interface NoteRichCellProps {
  value: NoteRichCellValue | undefined;
  onChange: (value: NoteRichCellValue) => void;
}

/** 表セル内のコンパクトな備考エディタ（ツールバーなし）。フル操作はメモ欄で行う。 */
export function NoteRichCell({ value, onChange }: NoteRichCellProps) {
  return (
    <RichTextEditor
      value={value?.doc ?? emptyDoc()}
      onChange={(doc) => onChange({ doc })}
      className="min-h-[1.5em] text-sm"
    />
  );
}
