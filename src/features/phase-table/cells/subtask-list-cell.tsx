"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AutosizeTextarea } from "@/features/shared/autosize-textarea";
import { cn } from "@/lib/utils";
import type { SubtaskListCellValue } from "../types";

interface SubtaskListCellProps {
  value: SubtaskListCellValue | undefined;
  onChange: (value: SubtaskListCellValue) => void;
}

/**
 * サブタスク（チェックボックス付き項目をいくつでも追加できる）の一覧編集セル。docs/spec.md §2.2
 *
 * 項目の文字入力は備考・タスク名セルと同じ「常時編集可能・自動で行数分伸縮する」
 * 入力欄（AutosizeTextarea）にする（ユーザー要望：「サブタスクの文字を入力する欄が
 * 短すぎて入力しづらい。チェックボックス形式はそのままで、備考欄と同じような入力形式に
 * して欲しい」）。従来の1行Input＋クリックで編集モードに入る方式だと、長い文字列が
 * 折り返されず入力しづらかったため、クリック不要で直接打てるtextareaに置き換えた。
 */
export function SubtaskListCell({ value, onChange }: SubtaskListCellProps) {
  const [newLabel, setNewLabel] = useState("");
  const items = value?.items ?? [];

  const addItem = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onChange({ items: [...items, { label: trimmed, checked: false }] });
    setNewLabel("");
  };

  const commitLabel = (index: number, rawNext: string) => {
    const next = rawNext.trim();
    if (!next || next === items[index].label) return;
    onChange({
      items: items.map((it, i) => (i === index ? { ...it, label: next } : it)),
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-1.5">
          <Checkbox
            className="mt-1"
            checked={item.checked}
            onCheckedChange={(checked) =>
              onChange({
                items: items.map((it, i) =>
                  i === index ? { ...it, checked: checked === true } : it,
                ),
              })
            }
          />
          <AutosizeTextarea
            key={item.label}
            defaultValue={item.label}
            className={cn(
              "flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none",
              "hover:border-border focus:border-input focus:bg-background",
            )}
            onBlur={(e) => commitLabel(index, e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                // 改行せずそのまま確定（サブタスク名は基本1件のテキストとして扱う）。
                // isComposingガードで、日本語IME変換確定のEnterで誤って確定しないようにする。
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.value = item.label;
                e.currentTarget.blur();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="mt-0.5"
            onClick={() => onChange({ items: items.filter((_, i) => i !== index) })}
            title="削除"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex items-start gap-1">
        <AutosizeTextarea
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="サブタスクを追加"
          className="flex-1 rounded-sm border border-input bg-transparent px-1.5 py-1 text-xs outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="ghost" size="icon-xs" className="mt-0.5" onClick={addItem} title="追加">
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
