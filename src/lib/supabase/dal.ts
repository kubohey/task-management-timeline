import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer: Server Component / Server Action / Route Handler から
 * 必ずこの関数を経由してユーザーを取得する。
 * React の cache() で1レンダー内の重複呼び出しをまとめる。
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email };
});
