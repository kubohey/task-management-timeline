"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  /** Supabase Authのuser.emailはphone認証等でundefinedになりうるためoptional。 */
  email: string | undefined;
  /** ログアウト用Server Action（page.tsx側から渡す）。 */
  logoutAction: () => void | Promise<void>;
}

const TABS = [
  { href: "/", label: "Gantt chart" },
  { href: "/roadmap", label: "Roadmap" },
] as const;

/**
 * 各画面共通のヘッダー。タイトル・タブ（ガントチャート/ロードマップ）・ユーザー情報・
 * ログアウトをまとめる。タブは実ルート（`/`・`/roadmap`）の切り替えで、
 * 現在のパスをusePathnameで見てハイライトする。
 */
export function AppHeader({ email, logoutAction }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <Image
          src="/logo.png"
          alt="Task Management Timeline"
          width={1297}
          height={385}
          priority
          className="h-14 w-auto"
        />
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                pathname === tab.href
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{email}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            ログアウト
          </Button>
        </form>
      </div>
    </header>
  );
}
