"use client";

import { useEffect, useId } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 指定テーブルのPostgres Changesを購読し、変更があったら該当のReact Queryキャッシュを
 * invalidateする共通フック。RLSにより自分のuser_idに紐づく変更しか流れてこないため、
 * クライアント側でのフィルタリングは不要。
 *
 * 複数デバイスから同時に開いている場合、他デバイスでの変更が数百ms〜数秒以内に
 * 画面へ反映される（Last-Write-Wins、詳細はdocs/spec.md §4を参照）。
 *
 * 同じ(table, filter, queryKey)を複数のコンポーネントが同時に購読すること
 * （例：同じPhaseのタスク表をインライン表示とダイアログ表示で同時に開く）があるため、
 * チャンネル名にはコンポーネントインスタンスごとに一意なidを含める。同名チャンネルの
 * 使い回しはSupabaseクライアント側で「subscribe後にonを追加できない」エラーになるため。
 * enabledをfalseにすると購読自体を行わない（マウントはされているが非表示のダイアログなど）。
 */
export function useRealtimeTable(
  table: string,
  queryKey: QueryKey,
  filter?: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const queryKeyString = JSON.stringify(queryKey);
  const instanceId = useId();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? "all"}:${queryKeyString}:${instanceId}`)
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
  }, [table, filter, queryKeyString, instanceId, enabled]);
}
