"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineEditableTextProps {
  value: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSubmit: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * クリックで編集開始、Enter/blurで確定、Escapeでキャンセルするインライン編集テキスト。
 * 非制御コンポーネント（defaultValue + key={value}）にすることで、編集開始のたびに
 * 最新のvalueで初期化されるため、useEffectでの同期が不要。
 */
export function InlineEditableText({
  value,
  editing,
  onEditingChange,
  onSubmit,
  className,
  style,
}: InlineEditableTextProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = inputRef.current?.value.trim() ?? "";
    onEditingChange(false);
    if (trimmed && trimmed !== value) {
      onSubmit(trimmed);
    }
  };

  if (!editing) {
    return (
      <span className={cn("truncate", className)} style={style} title={value}>
        {value}
      </span>
    );
  }

  return (
    <Input
      key={value}
      ref={inputRef}
      defaultValue={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onEditingChange(false);
        }
      }}
      className={cn("h-7 px-1.5 py-0", className)}
      style={style}
    />
  );
}
