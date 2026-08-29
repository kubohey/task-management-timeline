"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZOOM_MAX_PERCENT, ZOOM_MIN_PERCENT, ZOOM_STEP_PERCENT } from "@/store/ui-store";

interface ZoomControlProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * 画面全体の拡大縮小コントロール（ガントチャート・ロードマップ共通）。
 * 実体はCSSのzoomプロパティを掛けるだけの表示上の拡大縮小で、値そのもの
 * （日付・週の幅など）は変えない。中央のパーセント表示はクリックで100%へ戻す。
 */
export function ZoomControl({ value, onChange }: ZoomControlProps) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="Zoom out"
        disabled={value <= ZOOM_MIN_PERCENT}
        onClick={() => onChange(value - ZOOM_STEP_PERCENT)}
      >
        <MinusIcon />
      </Button>
      <button
        type="button"
        className="w-10 text-center text-xs text-muted-foreground hover:text-foreground"
        title="Reset zoom to 100%"
        onClick={() => onChange(100)}
      >
        {value}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="Zoom in"
        disabled={value >= ZOOM_MAX_PERCENT}
        onClick={() => onChange(value + ZOOM_STEP_PERCENT)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
