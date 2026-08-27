import { verifySession } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await verifySession();

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Task Management Timeline</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{session.email}</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Timeline（Phase 1で実装予定）
      </div>
    </main>
  );
}
