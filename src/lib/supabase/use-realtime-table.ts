"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 指定テーブルのPostgres Changesを購読し、変更があったら該当のReact Queryキャッシュを
 * invalidateする共通フック。RLSにより自分のuser_idに紐づく変更しか流れてこないため、
 * クライアント側でのフィルタリングは不要。
 *
 * 複数デバイスから同時に開いている場合、他デバイスでの変更が数百ms〜数秒以内に
 * 画面へ反映される（Last-Write-Wins、詳細はdocs/spec.md §4を参照）。
 */
export function useRealtimeTable(table: string, queryKey: QueryKey, filter?: string) {
  const queryClient = useQueryClient();
  const queryKeyString = JSON.stringify(queryKey);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? "all"}:${queryKeyString}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyString) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, queryKeyString]);
}
