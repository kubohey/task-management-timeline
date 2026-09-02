"use client";

import { Fragment, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { format } from "date-fns";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { docToMarkdown } from "@/features/daily-note/obsidian-export";
import { Button } from "@/components/ui/button";
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

interface RawEntry {
  day: Date;
  iso: string;
  lines: PreviewLine[];
  /** 日付グリッド内でのgrid-column（先頭のleadingWidthスペーサー分+1）。 */
  column: number;
}

interface PositionedEntry extends RawEntry {
  /** 0が対象日の列にいちばん近い段。値が大きいほど上（カレンダーから遠い段）に積む。 */
  tier: number;
}

/** 展開時の吹き出し幅（`w-44`=11rem と一致させる）。段の重なり判定に使う概算値。 */
const EXPANDED_WIDTH_PX = 176;
/** 折りたたみ時（日付チップのみ）の概算幅。 */
const COLLAPSED_WIDTH_PX = 104;
/** 隣り合う吹き出し同士に最低限空けるすき間。 */
const GAP_PX = 8;
/** 最下段の吹き出しから日付ヘッダーまでのテール（縦線）の長さ。 */
const TAIL_PX = 8;

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
 * 連日outside予定がある場合に吹き出し同士が重ならないよう、日付順に貪欲法で「段」を割り当てる
 * （区間スケジューリングの標準的な貪欲法：各段の直前に置いた吹き出しの右端だけを覚えておき、
 * 次の吹き出しがそれと重ならない最も下の段を選ぶ）。段0がいちばん下（対象日に近い）、
 * 番号が大きいほど上に積み上がる。
 */
function assignTiers(
  entries: RawEntry[],
  dayWidth: number,
  collapsedByDate: Record<string, boolean>,
): PositionedEntry[] {
  const tierRightEdges: number[] = [];
  return entries.map((entry) => {
    const isCollapsed = collapsedByDate[entry.iso] ?? false;
    const width = isCollapsed ? COLLAPSED_WIDTH_PX : EXPANDED_WIDTH_PX;
    // column基準（leadingWidthスペーサーを1列目とする）でのセル中心のX座標。
    const centerX = (entry.column - 2) * dayWidth + dayWidth / 2;
    const left = centerX - width / 2;
    const right = centerX + width / 2;

    let tier = 0;
    while (tier < tierRightEdges.length && left < tierRightEdges[tier] + GAP_PX) {
      tier++;
    }
    tierRightEdges[tier] = right;
    return { ...entry, tier };
  });
}

/**
 * outsideタスクが1件以上ある日の上に表示する、折りたたみ可能な吹き出し
 * （outsideについて.png参照）。日付ヘッダー（TimelineHeader）の一部として、月ラベル行の
 * 上に「吹き出しレーン」を1行追加する形で描画する。
 *
 * - 各吹き出しはCSS Gridで対象日の列の真上に配置し、下端の縦線（テール）で日付ヘッダーを
 *   指し示す。連日outside予定がある等で吹き出し同士が重なりそうな場合は、`assignTiers`で
 *   衝突しない段（グリッドの行）へ階層的に積み上げる（段が上がるほどテールが長くなり、
 *   下の段を飛び越えて対象日まで伸びる）。
 * - 個々の吹き出しはクリックで開閉できる（`collapsed`）ほか、レーン左端のトグルで吹き出し
 *   ライン全体を一括で折りたたむこともできる（`laneCollapsed`）。どちらもどこにも永続化
 *   しない（リロードすれば既定の展開状態に戻る＝セッション内のみ保持）。
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
  const [laneCollapsed, setLaneCollapsed] = useState(false);

  if (endIndex < startIndex) {
    return null;
  }

  const rawEntries: RawEntry[] = days.slice(startIndex, endIndex + 1).flatMap((day, i) => {
    const iso = format(day, "yyyy-MM-dd");
    const content = outsideContentNotes.get(iso);
    if (!content) {
      return [];
    }
    const lines = toPreviewLines(content);
    return lines.length > 0 ? [{ day, iso, lines, column: i + 2 }] : [];
  });

  if (rawEntries.length === 0) {
    return null;
  }

  const columnCount = endIndex - startIndex + 1;
  const entries = assignTiers(rawEntries, dayWidth, collapsed);
  const tierCount = Math.max(...entries.map((e) => e.tier)) + 1;

  return (
    <div className="flex items-stretch border-b">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center justify-center border-r bg-background"
        style={{ width: SIDEBAR_WIDTH_PX }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={laneCollapsed ? "outsideの吹き出しをすべて展開" : "outsideの吹き出しをすべて折りたたむ"}
          onClick={() => setLaneCollapsed((v) => !v)}
        >
          {laneCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </Button>
      </div>
      {!laneCollapsed && (
        <div
          className="grid flex-1"
          style={{
            gridTemplateColumns: `${leadingWidth}px repeat(${columnCount}, ${dayWidth}px) ${trailingWidth}px`,
            gridTemplateRows: `repeat(${tierCount}, auto) ${TAIL_PX}px`,
          }}
        >
          {entries.map(({ day, iso, lines, column, tier }) => {
            const isCollapsed = collapsed[iso] ?? false;
            const bubbleRow = tierCount - tier;
            return (
              <Fragment key={iso}>
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [iso]: !isCollapsed }))}
                  title={isCollapsed ? "クリックして展開" : "クリックして折りたたむ"}
                  className={cn(
                    "relative z-10 rounded-md border bg-popover text-left shadow-sm hover:brightness-95",
                    isCollapsed ? "px-2 py-1" : "w-44 px-2.5 py-2",
                  )}
                  style={{ gridColumn: column, gridRow: bubbleRow, alignSelf: "end", justifySelf: "center" }}
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
                {/* テール：吹き出しの段から対象日の列を通って日付ヘッダーへ向かう縦線。
                    上の段ほど、間の（この列では空いている）段を突き抜けて長くなる。 */}
                <div
                  className="w-px bg-border"
                  style={{
                    gridColumn: column,
                    gridRow: `${bubbleRow} / ${tierCount + 2}`,
                    justifySelf: "center",
                    alignSelf: "stretch",
                  }}
                />
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
