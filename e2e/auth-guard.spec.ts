import { expect, test } from "@playwright/test";

/**
 * 未ログイン状態でのアクセスガード（proxy.ts / dal.ts）を確認する最小限のテスト。
 * データを一切変更しないため、どの環境（開発/本番）に対して実行しても安全。
 */
test.describe("認証ガード", () => {
  test("未ログインで / にアクセスすると /login へリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ログイン画面が表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Task Management Timeline" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });
});
