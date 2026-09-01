"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { format } from "date-fns";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { docToMarkdown } from "@/features/daily-note/obsidian-export";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_PX } from "./constants";
import { getDayTextColorClass, getWeekdayLabel } from "./date-utils";

interface OutsideTaskCalloutsProps {
  days: Date[];
  startIndex: number;
  endIndex: number;
  leadingWidth: number;
  trailingWidth: number;
  dayWidth: number;
  outsideContentNotes: Map<string, JSONContent>;
}

interface PreviewLine {
  text: string;
  checked?: boolean;
}

/**
 * outside専用メモ（Tiptap doc）を、吹き出しに収まる簡潔な行リストへ変換する。
 * 既存のMarkdown変換（docToMarkdown）を再利用し、行頭の記法（`- `, `- [ ] `, `#`, `1. `等）
 * だけ取り除いてプレーンな箇条書き表示にする（吹き出しは要約表示のため、太字等の装飾記法は
 * そのまま残しても崩れないので変換しない）。
 */
function toPreviewLines(doc: JSONContent): PreviewLine[] {
  return docToMarkdown(doc)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const taskMatch = line.match(/^-\s\[([ x])\]\s(.*)$/);
      if (taskMatch) {
        return { text: taskMatch[2], checked: taskMatch[1] === "x" };
      }
      const match = line.match(/^(?:-|\d+\.|#+)\s(.*)$/);
      return { text: match ? match[1] : line };
    });
}

/**
 * outsideタスクが1件以上ある日の上に表示する、折りたたみ可能な吹き出し
 * （outsideについて.png参照）。日付ヘッダー（TimelineHeader）の一部として、月ラベル行の
 * 上に「吹き出しレーン」を1行追加する形で描画する。CSS Gridの列幅を日付ヘッダーの各セルと
 * 完全に一致させることで、各吹き出しがその日の列の真上（吹き出し下端が次の行＝月ラベル行の
 * 境界）に来るようにし、下端に小さな縦線（テール）を添えて対象の日を指し示す。
 *
 * 開閉状態は吹き出しごとにクリックで切り替えられるが、あえてどこにも永続化しない
 * （リロードすれば既定の展開状態に戻る＝セッション内のみ保持）。
 */
export function OutsideTaskCallouts({
  days,
  startIndex,
  endIndex,
  leadingWidth,
  trailingWidth,
  dayWidth,
  outsideContentNotes,
}: OutsideTaskCalloutsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (endIndex < startIndex) {
    return null;
  }

  const entries = days.slice(startIndex, endIndex + 1).flatMap((day, i) => {
    const iso = format(day, "yyyy-MM-dd");
    const content = outsideContentNotes.get(iso);
    if (!content) {
      return [];
    }
    const lines = toPreviewLines(content);
    return lines.length > 0 ? [{ day, iso, lines, column: i + 2 }] : [];
  });

  if (entries.length === 0) {
    return null;
  }

  const columnCount = endIndex - startIndex + 1;

  return (
    <div
      className="grid items-end border-b"
      style={{
        gridTemplateColumns: `${SIDEBAR_WIDTH_PX + leadingWidth}px repeat(${columnCount}, ${dayWidth}px) ${trailingWidth}px`,
      }}
    >
      {entries.map(({ day, iso, lines, column }) => {
        const isCollapsed = collapsed[iso] ?? false;
        return (
          <div key={iso} className="flex flex-col items-center pt-2" style={{ gridColumn: column }}>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [iso]: !isCollapsed }))}
              title={isCollapsed ? "クリックして展開" : "クリックして折りたたむ"}
              className={cn(
                "relative z-10 rounded-md border bg-popover text-left shadow-sm hover:brightness-95",
                isCollapsed ? "px-2 py-1" : "w-44 px-2.5 py-2",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold whitespace-nowrap",
                  getDayTextColorClass(day),
                )}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="size-3 shrink-0" />
                ) : (
                  <ChevronDownIcon className="size-3 shrink-0" />
                )}
                <span>
                  {format(day, "M/d")}（{getWeekdayLabel(day)}）
                </span>
              </div>
              {!isCollapsed && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-foreground">
                  {lines.map((line, i) => (
                    <li
                      key={i}
                      className={cn(
                        "break-words",
                        line.checked && "text-muted-foreground line-through",
                      )}
                    >
                      {line.text}
                    </li>
                  ))}
                </ul>
              )}
            </button>
            {/* テール：吹き出し下端から対象日の列（次の行）へ向かう短い縦線 */}
            <div className="h-2 w-px bg-border" />
          </div>
        );
      })}
    </div>
  );
}
