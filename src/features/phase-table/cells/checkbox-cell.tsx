"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { CheckboxCellValue } from "../types";

interface CheckboxCellProps {
  value: CheckboxCellValue | undefined;
  onChange: (value: CheckboxCellValue) => void;
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
  return (
    <Checkbox
      checked={value?.checked ?? false}
      onCheckedChange={(checked) => onChange({ checked: checked === true })}
    />
  );
}
