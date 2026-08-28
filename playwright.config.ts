import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Next.jsと同じ方法で.env.local等を読み込む（E2E_EMAIL/E2E_PASSWORD等をテストプロセスにも渡すため）。
loadEnvConfig(process.cwd());

/**
 * 最小限のE2Eスモークテスト設定。
 * - ローカル実行時は `npm run dev` を自動起動してテストする（既に起動中ならそれを使う）
 * - 認証必須の画面はGroup追加などのデータ変更を伴う操作をしないため、
 *   本番/開発いずれのSupabaseプロジェクトに対して実行しても実データを汚さない
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
