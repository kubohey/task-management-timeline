"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TableColumnType } from "./types";

const TYPE_LABELS: Record<TableColumnType, string> = {
  checkbox: "チェックボックス",
  text: "テキスト",
  note_rich: "リッチテキスト",
  subtask_list: "サブタスク一覧",
};

interface AddColumnPopoverProps {
  onCreate: (label: string, type: TableColumnType) => void;
}

/** Phase内タスク表に列を追加するフォーム。docs/spec.md §9「列自体の追加」（Phase 6）。 */
export function AddColumnPopover({ onCreate }: AddColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<TableColumnType>("text");

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed, type);
    setLabel("");
    setType("text");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" title="列を追加">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={label}
            placeholder="列名"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="justify-start">
                {TYPE_LABELS[type]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(TYPE_LABELS) as TableColumnType[]).map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setType(t)}>
                  {TYPE_LABELS[t]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" size="sm" onClick={submit}>
            追加
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
