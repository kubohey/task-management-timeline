"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** テキストエリアの高さを内容の行数に合わせて伸縮させる。 */
function resizeToFit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * 内容の行数に合わせて高さが自動で伸縮するtextarea。
 * 1行分の高さしかない`<Input>`だと長い文字列が入力しづらいセル（サブタスクの
 * 項目名など）で、備考・タスク名セル（TextCell）と同じ「入力欄が勝手に広がる」
 * 使用感を共有するために使う。制御・非制御どちらの用途にも使えるよう、
 * 通常の`<textarea>`のprops（value/defaultValue含む）をそのまま受け取る。
 */
export function AutosizeTextarea({
  className,
  onInput,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // valueやdefaultValueが変わって内容が書き換わった直後も高さを合わせ直す。
  useLayoutEffect(() => {
    if (ref.current) {
      resizeToFit(ref.current);
    }
  });

  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn("w-full resize-none overflow-hidden", className)}
      onInput={(e) => {
        resizeToFit(e.currentTarget);
        onInput?.(e);
      }}
      {...props}
    />
  );
}
