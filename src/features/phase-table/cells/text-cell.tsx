"use client";

import { cn } from "@/lib/utils";
import type { TextCellValue } from "../types";

interface TextCellProps {
  value: TextCellValue | undefined;
  onChange: (value: TextCellValue) => void;
}

/**
 * 常時編集可能なテキストセル（タスク名・備考）。blurで確定する。
 * 非制御コンポーネント（defaultValue + key={text}）にすることで、他デバイスからの
 * 変更を受け取った際に最新値で再初期化される。docs/spec.md §2.2
 */
export function TextCell({ value, onChange }: TextCellProps) {
  const text = value?.text ?? "";

  return (
    <textarea
      key={text}
      defaultValue={text}
      rows={1}
      className={cn(
        "w-full resize-none rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none",
        "hover:border-border focus:border-input focus:bg-background",
      )}
      onBlur={(e) => {
        const next = e.currentTarget.value;
        if (next !== text) {
          onChange({ text: next });
        }
      }}
    />
  );
}
