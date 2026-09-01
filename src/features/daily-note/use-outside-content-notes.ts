"use client";

import { useMemo } from "react";
import type { JSONContent } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchOutsideContentNotes } from "./api";

/**
 * outside専用メモ欄に中身がある日付を、日付→本文（Tiptap doc）のMapで返す。
 * カレンダーの日付ヘッダー上の吹き出し（timeline/outside-task-callouts.tsx）が、
 * 該当する日の上に折りたたみ可能な吹き出しを表示するために使う。
 */
export function useOutsideContentNotes(): Map<string, JSONContent> {
  useRealtimeTable("daily_notes", ["outsideContentNotes"]);
  const query = useQuery({
    queryKey: ["outsideContentNotes"],
    queryFn: fetchOutsideContentNotes,
  });
  return useMemo(() => {
    const map = new Map<string, JSONContent>();
    for (const row of query.data ?? []) {
      map.set(row.date, row.content);
    }
    return map;
  }, [query.data]);
}
