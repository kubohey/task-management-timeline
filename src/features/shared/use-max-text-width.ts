"use client";

import { useMemo } from "react";

let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string, font: string): number {
  if (typeof document === "undefined") {
    return text.length * 8;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) {
    return text.length * 8;
  }
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * 同階層タブの表示幅を、最長の名称に合わせて動的に統一するためのフック。
 * docs/spec.md §2.1「同階層内で最も長い名称に合わせて動的に統一される」
 */
export function useUniformLabelWidth(
  names: string[],
  options?: { font?: string; minWidth?: number; paddingX?: number },
): number {
  const font = options?.font ?? "500 14px ui-sans-serif, system-ui, sans-serif";
  const minWidth = options?.minWidth ?? 64;
  const paddingX = options?.paddingX ?? 8;
  // 配列の参照ではなく中身（値）を依存値にしたいので、結合した文字列にしておく。
  const namesKey = names.join(" ");

  return useMemo(() => {
    const widest = names.reduce(
      (max, name) => Math.max(max, measureTextWidth(name, font)),
      0,
    );
    return Math.max(minWidth, Math.ceil(widest + paddingX));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, font, minWidth, paddingX]);
}
