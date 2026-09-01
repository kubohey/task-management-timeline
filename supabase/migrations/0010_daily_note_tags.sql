-- Task Management Timeline: デイリーノートへのタグ追加（プロジェクト外の予定）
-- 旅行など、プロジェクトのタスクを進められない日にユーザーが自分でノートへ付けられる
-- タグの一覧。今のところ使うのは「outside」（プロジェクト外の予定がある日）のみだが、
-- 将来別のタグを増やせるようtext[]にしておく。ガントチャート側は"outside"タグが付いた
-- 日の列を薄いグレーで塗りつぶす（フロントの判定はdate-utils.ts参照）。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table daily_notes add column if not exists tags text[] not null default '{}';

-- タグでの絞り込み（`tags @> '{outside}'`）を使うためのGINインデックス。
create index if not exists idx_daily_notes_tags on daily_notes using gin (tags);
