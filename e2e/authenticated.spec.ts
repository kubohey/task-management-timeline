import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

/**
 * ログイン後のスモークテスト。実際のアカウントでログインするため、
 * ローカルの .env.local（gitignore対象）に E2E_EMAIL / E2E_PASSWORD を
 * 設定した場合のみ実行される。Group作成などデータを変更する操作は行わないため、
 * 設定しても実データを汚さない。
 */
test.describe("ログイン後のタイムライン表示", () => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  test("ログインするとタイムライン画面がエラーなく表示される", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(email!);
    await page.getByLabel("パスワード").fill(password!);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Task Management Timeline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Group", exact: true })).toBeVisible();
    await expect(page.getByText("データの取得に失敗しました")).toHaveCount(0);
  });
});
