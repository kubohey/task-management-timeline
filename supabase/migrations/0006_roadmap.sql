-- Task Management Timeline: ロードマップタブ
-- 週単位（月曜始まり）の行 × Project単位の列でタスクを俯瞰する、メインのガントチャート
-- （日単位の横方向タイムライン）とは軸を入れ替えた別画面。
--
-- roadmap_columns: ユーザーが既存Projectを選んで作る「列」。列ラベルはProject名で
--   初期化されるが、以後は独立して自由編集できる（実際のProject名は変わらない）。
-- roadmap_tasks: 週セルに埋め込む「タスクブロック」。既存Project/Phaseを選んで埋め込み、
--   ラベルはそのとき選んだ名前で初期化されるが、以後は独立して自由編集できる。
--   背景色だけは埋め込み元（Phaseの場合はそのPhaseが属するProject）の色と連動させたいため、
--   参照先（source_project_id / source_phase_id）は保持し続ける。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らないため、他のマイグレーション同様、何度再実行しても安全（冪等）になるようにしてある。

create table if not exists roadmap_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  label text not null,
  width integer not null default 220,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_roadmap_columns_user_id on roadmap_columns(user_id);

create table if not exists roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references roadmap_columns(id) on delete cascade,
  source_type text not null check (source_type in ('project', 'phase')),
  source_project_id uuid references projects(id) on delete set null,
  source_phase_id uuid references phases(id) on delete set null,
  label text not null,
  start_week date not null,
  end_week date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_week >= start_week)
);

create index if not exists idx_roadmap_tasks_column_id on roadmap_tasks(column_id);

-- ============================================================
-- updated_at 自動更新（既存のset_updated_at()を再利用）
-- ============================================================

drop trigger if exists trg_set_updated_at on roadmap_columns;
create trigger trg_set_updated_at before update on roadmap_columns
  for each row execute function set_updated_at();

drop trigger if exists trg_set_updated_at on roadmap_tasks;
create trigger trg_set_updated_at before update on roadmap_tasks
  for each row execute function set_updated_at();

-- ============================================================
-- 所有権チェック用ヘルパー関数（RLSポリシーから利用。既存のowns_*と同じ方針）
-- ============================================================

create or replace function owns_roadmap_column(target_column_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from roadmap_columns where id = target_column_id and user_id = auth.uid()
  );
$$;

grant execute on function owns_roadmap_column(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table roadmap_columns enable row level security;
alter table roadmap_tasks enable row level security;

drop policy if exists "roadmap_columns_owner_all" on roadmap_columns;
create policy "roadmap_columns_owner_all" on roadmap_columns
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "roadmap_tasks_owner_all" on roadmap_tasks;
create policy "roadmap_tasks_owner_all" on roadmap_tasks
  for all
  using (owns_roadmap_column(column_id))
  with check (owns_roadmap_column(column_id));

-- ============================================================
-- Realtime配信の対象に追加
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roadmap_columns'
  ) then
    alter publication supabase_realtime add table roadmap_columns;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roadmap_tasks'
  ) then
    alter publication supabase_realtime add table roadmap_tasks;
  end if;
end;
$$;
