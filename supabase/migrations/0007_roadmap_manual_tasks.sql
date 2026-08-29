-- Task Management Timeline: ロードマップの週セルへの直接書き込み・背景色の手動編集
-- 既存Project/Phaseの埋め込みに加え、週セルに直接テキストを書き込んで作る
-- 「手動タスクブロック」（source_type = 'manual'）に対応する。
-- 手動ブロックは埋め込み元を持たないため、背景色は自分で自由に選べるよう
-- roadmap_tasks.color を追加する（project/phase埋め込みのブロックは引き続き
-- source_project_id / source_phase_id 経由で埋め込み元の色と連動し、colorは使わない）。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table roadmap_tasks add column if not exists color text;

alter table roadmap_tasks drop constraint if exists roadmap_tasks_source_type_check;
alter table roadmap_tasks add constraint roadmap_tasks_source_type_check
  check (source_type in ('project', 'phase', 'manual'));
