"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const TAB_COLOR_PRESETS = [
  "#fee2e2",
  "#ffedd5",
  "#fef9c3",
  "#dcfce7",
  "#cffafe",
  "#dbeafe",
  "#e0e7ff",
  "#f3e8ff",
  "#fce7f3",
  "#e5e7eb",
];

interface ColorPickerProps {
  color: string | null;
  onChange: (color: string | null) => void;
}

/** タブの背景色編集用ピッカー（プリセット + カスタム + リセット）。docs/spec.md §2.1 */
export function ColorPicker({ color, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" title="Change background color">
          🎨
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="grid grid-cols-5 gap-1.5">
          {TAB_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={cn(
                "size-6 rounded-full border border-border",
                color === preset && "ring-2 ring-ring ring-offset-1",
              )}
              style={{ backgroundColor: preset }}
              aria-label={preset}
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="color"
            value={color ?? "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
            aria-label="Custom background color"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
