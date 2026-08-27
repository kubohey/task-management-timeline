# Task Management Timeline

ガントチャートでタスクを管理するための個人用Webアプリ。仕様の詳細は [`docs/spec.md`](./docs/spec.md) を参照。

## セットアップ

### 1. Supabaseプロジェクトの作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. `.env.local.example` を `.env.local` にコピーし、Supabaseの `Settings > API` から `Project URL` と `anon public` キーを設定

```bash
cp .env.local.example .env.local
```

### 2. DBスキーマの適用

Supabaseダッシュボードの `SQL Editor` で `supabase/migrations/0001_init.sql` の内容を実行する（またはSupabase CLIの `supabase db push` を利用）。

- 階層構造（groups/projects/phases）、Phaseテーブル（table_columns/table_rows/table_cells）、カレンダー登録タスク（task_placements）のテーブルとRLSポリシーを作成
- Phase作成時、デフォルト4列（チェックボックス／タスク名／備考／サブタスク）が自動生成される
- 主要テーブルはRealtime配信対象として登録済み

### 3. サインアップの無効化・自分のアカウント作成

個人利用のアプリを公開URLでホスティングするため、第三者がアカウントを作れないようにする。

1. Supabaseダッシュボード `Authentication > Sign In / Providers` で **Allow new users to sign up** を無効化
2. 無効化する前に、`Authentication > Users` から自分のメールアドレスでユーザーを1件作成しておく（またはSQL Editorで作成後に無効化）

### 4. ローカル起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセス。未ログインの場合は `/login` にリダイレクトされる。

## ディレクトリ構成（Phase 0時点）

```
src/
  app/
    layout.tsx        … ルートレイアウト（Providers: React Query / Tooltip / Toaster）
    page.tsx           … 認証必須のトップページ（Phase 1でTimelineに置き換え）
    login/              … ログイン画面・Server Action
  lib/supabase/
    client.ts           … ブラウザ用Supabaseクライアント
    server.ts           … Server Component/Action用Supabaseクライアント
    proxy.ts             … セッションリフレッシュ＋未ログインリダイレクト（proxy.tsから呼び出し）
    dal.ts                … Data Access Layer（verifySession）
    use-realtime-table.ts … Realtime購読の共通フック
  proxy.ts               … Next.js 16のProxy（旧Middleware）エントリポイント
  store/ui-store.ts       … UIの一時状態用Zustandストア
supabase/migrations/
  0001_init.sql           … 初期スキーマ・RLS・Realtime設定
docs/spec.md              … 仕様書
```

## 技術スタック

Next.js (App Router) / TypeScript / Tailwind CSS / shadcn+Radix UI / TanStack Table & Virtual /
dnd-kit / Tiptap / Zustand / TanStack Query / date-fns / holiday-jp / remark(-gfm) /
Supabase (Postgres, Auth, Realtime) / Vercel
