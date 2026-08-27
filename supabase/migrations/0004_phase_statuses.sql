-- Task Management Timeline: Phaseのstatusをユーザー定義の可変な一覧に変更
-- これまでは active/always/next の3値固定（DBのcheck制約・フロントのハードコード）
-- だったが、ユーザーが自由にstatusを追加・削除・名前変更・色変更できるようにする。
--
-- Supabase SQL Editorは貼り付けたスクリプト全体を1トランザクションとして実行するとは
-- 限らない（環境によっては途中の文の失敗以降だけ止まり、それより前の文は既にコミット
-- されていることがある）。そのため、CREATE TRIGGER/CREATE POLICYなど本来IF NOT EXISTSの
-- 効かない文も含め、スクリプト全体を何度再実行しても安全（冪等）になるようにしてある。

-- ============================================================
-- phase_statuses テーブル（ユーザーごとのstatus定義一覧）
-- ============================================================

create table if not exists phase_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_phase_statuses_user_id on phase_statuses(user_id);

drop trigger if exists trg_set_updated_at on phase_statuses;
create trigger trg_set_updated_at before update on phase_statuses
  for each row execute function set_updated_at();

alter table phase_statuses enable row level security;

drop policy if exists "phase_statuses_owner_all" on phase_statuses;
create policy "phase_statuses_owner_all" on phase_statuses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'phase_statuses'
  ) then
    alter publication supabase_realtime add table phase_statuses;
  end if;
end;
$$;

-- ============================================================
-- phases.status_id 列を追加（phase_statusesへの参照）
-- ============================================================

alter table phases add column if not exists status_id uuid references phase_statuses(id) on delete set null;

-- ============================================================
-- 既存データの移行：ユーザーごとに旧active/next/alwaysをphase_statusesとして作成し、
-- 対応するphasesのstatus_idを埋める
-- 旧status列（次のブロックで削除）が既に無い場合は何もしない（再実行時の安全策）。
-- 既にそのユーザーのphase_statusesが1件でもあれば、二重作成を避けるためスキップする。
-- ============================================================

do $$
declare
  uid uuid;
  active_id uuid;
  next_id uuid;
  always_id uuid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'phases' and column_name = 'status'
  ) then
    return;
  end if;

  for uid in select distinct user_id from groups
  loop
    if exists (select 1 from phase_statuses where user_id = uid) then
      continue;
    end if;

    insert into phase_statuses (user_id, name, color, sort_order)
      values (uid, 'active', '#3b82f6', 0) returning id into active_id;
    insert into phase_statuses (user_id, name, color, sort_order)
      values (uid, 'next', '#f59e0b', 1) returning id into next_id;
    insert into phase_statuses (user_id, name, color, sort_order)
      values (uid, 'always', '#10b981', 2) returning id into always_id;

    update phases ph
    set status_id = case ph.status
      when 'active' then active_id
      when 'next' then next_id
      when 'always' then always_id
      else null
    end
    from projects pr, groups g
    where ph.project_id = pr.id
      and pr.group_id = g.id
      and g.user_id = uid
      and ph.status is not null;
  end loop;
end;
$$;

-- ============================================================
-- 旧status列（text + check制約）を削除
-- ============================================================

alter table phases drop column if exists status;
