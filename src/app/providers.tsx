"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useUiStore } from "@/store/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
          },
        },
      }),
  );

  // ズーム率（ui-store）はlocalStorageに永続化しているが、SSR/初回クライアント描画の
  // 不一致（hydration mismatch）を避けるためstore側は`skipHydration: true`にしてあり、
  // 実際の読み込みはマウント後にここで行う（ユーザー要望：「前回のズーム率のまま
  // 表示して欲しい」）。
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
