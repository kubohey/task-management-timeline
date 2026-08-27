-- Task Management Timeline: 初期スキーマ
-- 階層構造: groups(自己参照でGroup/Subgroup) -> projects -> phases -> table_columns/table_rows -> table_cells
-- カレンダー登録タスク: task_placements（table_rows への参照。実体を複製しない）

create extension if not exists "pgcrypto";

-- ============================================================
-- テーブル定義
-- ============================================================

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_group_id uuid references groups(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  status text check (status in ('active', 'always', 'next')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists table_columns (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null check (type in ('checkbox', 'text', 'note_rich', 'subtask_list')),
  width integer not null default 160,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase_id, key)
);

create table if not exists table_rows (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  sort_order integer not null default 0,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists table_cells (
  row_id uuid not null references table_rows(id) on delete cascade,
  column_id uuid not null references table_columns(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (row_id, column_id)
);

create table if not exists task_placements (
  id uuid primary key default gen_random_uuid(),
  source_row_id uuid not null references table_rows(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_groups_user_id on groups(user_id);
create index if not exists idx_groups_parent_group_id on groups(parent_group_id);
create index if not exists idx_projects_group_id on projects(group_id);
create index if not exists idx_phases_project_id on phases(project_id);
create index if not exists idx_table_columns_phase_id on table_columns(phase_id);
create index if not exists idx_table_rows_phase_id on table_rows(phase_id);
create index if not exists idx_table_cells_column_id on table_cells(column_id);
create index if not exists idx_task_placements_source_row_id on task_placements(source_row_id);

-- ============================================================
-- updated_at 自動更新
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['groups', 'projects', 'phases', 'table_columns', 'table_rows', 'table_cells', 'task_placements']
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ============================================================
-- Phase作成時にデフォルト4列を自動生成
-- ============================================================

create or replace function create_default_table_columns()
returns trigger
language plpgsql
as $$
begin
  insert into table_columns (phase_id, key, label, type, width, sort_order) values
    (new.id, 'checkbox', ' ', 'checkbox', 48, 0),
    (new.id, 'task_name', 'タスク名', 'text', 240, 1),
    (new.id, 'note', '備考', 'text', 320, 2),
    (new.id, 'subtasks', 'サブタスク', 'subtask_list', 240, 3);
  return new;
end;
$$;

create trigger trg_create_default_table_columns
  after insert on phases
  for each row execute function create_default_table_columns();

-- ============================================================
-- 所有権チェック用ヘルパー関数（RLSポリシーから利用）
-- security definer で、ポリシー評価の再帰を避けつつ所有権のみ判定する
-- ============================================================

create or replace function owns_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from groups where id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function owns_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from projects pr
    join groups g on g.id = pr.group_id
    where pr.id = target_project_id and g.user_id = auth.uid()
  );
$$;

create or replace function owns_phase(target_phase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from phases ph
    join projects pr on pr.id = ph.project_id
    join groups g on g.id = pr.group_id
    where ph.id = target_phase_id and g.user_id = auth.uid()
  );
$$;

create or replace function owns_row(target_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from table_rows tr
    join phases ph on ph.id = tr.phase_id
    join projects pr on pr.id = ph.project_id
    join groups g on g.id = pr.group_id
    where tr.id = target_row_id and g.user_id = auth.uid()
  );
$$;

grant execute on function owns_group(uuid) to authenticated;
grant execute on function owns_project(uuid) to authenticated;
grant execute on function owns_phase(uuid) to authenticated;
grant execute on function owns_row(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table groups enable row level security;
alter table projects enable row level security;
alter table phases enable row level security;
alter table table_columns enable row level security;
alter table table_rows enable row level security;
alter table table_cells enable row level security;
alter table task_placements enable row level security;

create policy "groups_owner_all" on groups
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "projects_owner_all" on projects
  for all
  using (owns_group(group_id))
  with check (owns_group(group_id));

create policy "phases_owner_all" on phases
  for all
  using (owns_project(project_id))
  with check (owns_project(project_id));

create policy "table_columns_owner_all" on table_columns
  for all
  using (owns_phase(phase_id))
  with check (owns_phase(phase_id));

create policy "table_rows_owner_all" on table_rows
  for all
  using (owns_phase(phase_id))
  with check (owns_phase(phase_id));

create policy "table_cells_owner_all" on table_cells
  for all
  using (owns_row(row_id))
  with check (owns_row(row_id));

create policy "task_placements_owner_all" on task_placements
  for all
  using (owns_row(source_row_id))
  with check (owns_row(source_row_id));

-- ============================================================
-- Realtime配信の対象に追加
-- ============================================================

alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table phases;
alter publication supabase_realtime add table table_columns;
alter publication supabase_realtime add table table_rows;
alter publication supabase_realtime add table table_cells;
alter publication supabase_realtime add table task_placements;
