"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { SubtaskListCellValue } from "../types";

interface SubtaskListCellProps {
  value: SubtaskListCellValue | undefined;
  onChange: (value: SubtaskListCellValue) => void;
}

/** サブタスク（チェックボックス付き項目をいくつでも追加できる）の一覧編集セル。docs/spec.md §2.2 */
export function SubtaskListCell({ value, onChange }: SubtaskListCellProps) {
  const [newLabel, setNewLabel] = useState("");
  const items = value?.items ?? [];

  const addItem = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onChange({ items: [...items, { label: trimmed, checked: false }] });
    setNewLabel("");
  };

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) =>
              onChange({
                items: items.map((it, i) =>
                  i === index ? { ...it, checked: checked === true } : it,
                ),
              })
            }
          />
          <span className="flex-1 truncate text-sm" title={item.label}>
            {item.label}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onChange({ items: items.filter((_, i) => i !== index) })}
            title="削除"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="サブタスクを追加"
          className="h-6 flex-1 px-1.5 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="ghost" size="icon-xs" onClick={addItem} title="追加">
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
