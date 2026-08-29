-- Task Management Timeline: デイリータスクノート
-- カレンダーの日付をクリックすると開く右サイドバー用のノート（日付ごとに1件、user_id+dateで一意）。
-- その日にカレンダー登録されたタスクの一覧（Project > Phase > タスク名）はtask_placements等から
-- その都度組み立てて表示するため、ここではユーザーが自由に書き込む本文（Tiptap doc）のみ保持する。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

create table if not exists daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_notes_user_id_date on daily_notes(user_id, date);

drop trigger if exists trg_set_updated_at on daily_notes;
create trigger trg_set_updated_at before update on daily_notes
  for each row execute function set_updated_at();

alter table daily_notes enable row level security;

drop policy if exists "daily_notes_owner_all" on daily_notes;
create policy "daily_notes_owner_all" on daily_notes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_notes'
  ) then
    alter publication supabase_realtime add table daily_notes;
  end if;
end;
$$;
