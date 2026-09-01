-- Task Management Timeline: outside専用タスク欄
-- 「outside」タグ（プロジェクト外の予定）をONにした日のノートに追加される、専用のチェック
-- リスト欄（旅行の持ち物・予定など、Phase表とは無関係な個人的タスク）。既存のノート本文
-- （content、Tiptapの自由記述）とは別のデータとして持つ。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table daily_notes add column if not exists outside_tasks jsonb not null default '[]'::jsonb;
