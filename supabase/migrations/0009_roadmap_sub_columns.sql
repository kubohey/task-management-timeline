-- Task Management Timeline: ロードマップの列内サブ列化
-- 週範囲が重なるかどうかで自動的にレーンを計算する方式（クラスターごとの
-- laneCount + lane_orderでの左右入れ替え）は、別の週で重ならないタスク同士でも
-- レーン位置が揃わないことがあり分かりづらいというユーザー報告を受け、
-- 明示的な「サブ列」（列内をユーザーが増やせる縦のレーン）に置き換える。
--
-- roadmap_columns.lane_count: このProject列に表示するサブ列の数（既定1）。
--   ヘッダーの「+」でユーザーが増やせる（減らす操作は今回は対象外）。
-- roadmap_tasks.lane: そのタスクがどのサブ列（0始まり）に置かれているか。
--   これまでのlane_orderは自動レーン計算の左右入れ替え用だったが未使用にする
--   （列自体は残すが、以後の書き込み・参照は行わない）。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

alter table roadmap_columns add column if not exists lane_count integer not null default 1;
alter table roadmap_tasks add column if not exists lane integer not null default 0;
