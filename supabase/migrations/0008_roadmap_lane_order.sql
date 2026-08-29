-- Task Management Timeline: ロードマップの並列表示（同じ列内で重なるタスク）の
-- 左右入れ替えに対応する。
-- 従来はレーン（左右の並び）を開始週だけから毎回自動計算していたため、
-- ユーザーが意図した左右の順序を保持できなかった。
-- lane_order（既定0）を追加し、レーン割り当て時のクラスター内の並び順を
-- 開始週ではなくこの値（+タイブレークにid）で決めるようにし、値を交換する
-- ことで左右を入れ替えられるようにする。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table roadmap_tasks add column if not exists lane_order integer not null default 0;
