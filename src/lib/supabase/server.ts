import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component / Server Action / Route Handler で使う Supabase クライアント。
 * Next.js の cookies() は Server Component からは書き込めないため、
 * setAll が失敗しても無視する（Proxy 側でセッションのリフレッシュを行うため問題ない）。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は無視してよい。
            // セッションのリフレッシュは proxy.ts 側で行う。
          }
        },
      },
    },
  );
}
