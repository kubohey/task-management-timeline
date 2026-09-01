"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchOutsideDates } from "./api";

/**
 * 「outside」タグ（プロジェクト外の予定）が付いたデイリーノートの日付一覧をSetで返す。
 * ガントチャート（TimelineHeader/CalendarRowCells/PhaseTimelineCells）が、該当する日の列を
 * 薄いグレーで塗りつぶすために使う。daily_notesテーブル全体を購読するため、タグ以外の
 * 編集（本文の保存など）でも再取得されるが、date一覧だけの軽いクエリなので許容する。
 */
export function useOutsideDates(): Set<string> {
  useRealtimeTable("daily_notes", ["outsideDates"]);
  const query = useQuery({ queryKey: ["outsideDates"], queryFn: fetchOutsideDates });
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}
