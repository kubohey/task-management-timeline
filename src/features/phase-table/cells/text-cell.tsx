"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TextCellValue } from "../types";

interface TextCellProps {
  value: TextCellValue | undefined;
  onChange: (value: TextCellValue) => void;
}

/** テキストエリアの高さを内容の行数に合わせて伸縮させる。 */
function resizeToFit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * 常時編集可能なテキストセル（タスク名・備考）。blurで確定する。
 * 非制御コンポーネント（defaultValue + key={text}）にすることで、他デバイスからの
 * 変更を受け取った際に最新値で再初期化される。docs/spec.md §2.2
 * 行数に応じてセルの高さが動的に拡大する。docs/spec.md §2.2
 */
export function TextCell({ value, onChange }: TextCellProps) {
  const text = value?.text ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      resizeToFit(textareaRef.current);
    }
  }, [text]);

  return (
    <textarea
      key={text}
      ref={textareaRef}
      defaultValue={text}
      rows={1}
      className={cn(
        "w-full resize-none overflow-hidden rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none",
        "hover:border-border focus:border-input focus:bg-background",
      )}
      onInput={(e) => resizeToFit(e.currentTarget)}
      onBlur={(e) => {
        const next = e.currentTarget.value;
        if (next !== text) {
          onChange({ text: next });
        }
      }}
    />
  );
}
