-- Task Management Timeline: outside専用メモ欄
-- 「outside」タグ（プロジェクト外の予定）をONにした日のノートに追加される、専用の自由記述
-- メモ欄（Tiptap doc）。既存の本文（content、プロジェクト用のメモ）と全く同じ形式・操作性で、
-- サイドバー内では2つのメモ欄が上下に画面分割された状態で並ぶ（プロジェクト用/outside用）。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table daily_notes
  add column if not exists outside_content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;
