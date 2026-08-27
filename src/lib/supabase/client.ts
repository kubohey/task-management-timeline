import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）で使う Supabase クライアント。
 * 呼び出しごとに生成するのではなく、モジュール内で使い回す。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
