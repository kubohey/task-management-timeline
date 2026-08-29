"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineCreateButtonProps {
  label: string;
  placeholder?: string;
  onCreate: (name: string) => void;
}

/** 「+ ラベル」ボタン。クリックすると名前入力欄に切り替わり、Enter/確定ボタンで作成する。 */
export function InlineCreateButton({ label, placeholder, onCreate }: InlineCreateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onCreate(trimmed);
    }
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={name}
        placeholder={placeholder ?? `${label} name`}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setName("");
          }
        }}
        onBlur={() => {
          if (!name.trim()) {
            setOpen(false);
          }
        }}
        className="h-7 w-40"
      />
      <Button type="button" size="sm" onClick={submit}>
        Add
      </Button>
    </div>
  );
}
