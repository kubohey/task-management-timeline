"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTable } from "@/lib/supabase/use-realtime-table";
import { fetchOutsideTaskNotes } from "./api";
import type { OutsideTaskItem } from "./types";

/**
 * outside専用タスク欄に1件以上項目がある日付を、日付→タスク一覧のMapで返す。
 * カレンダーの日付ヘッダー上の吹き出し（timeline/outside-task-callouts.tsx）が、
 * 該当する日の上に折りたたみ可能な吹き出しを表示するために使う。
 */
export function useOutsideTaskNotes(): Map<string, OutsideTaskItem[]> {
  useRealtimeTable("daily_notes", ["outsideTaskNotes"]);
  const query = useQuery({ queryKey: ["outsideTaskNotes"], queryFn: fetchOutsideTaskNotes });
  return useMemo(() => {
    const map = new Map<string, OutsideTaskItem[]>();
    for (const row of query.data ?? []) {
      map.set(row.date, row.tasks);
    }
    return map;
  }, [query.data]);
}
