-- Task Management Timeline: 備考列をリッチテキスト（note_rich）化
-- docs/spec.md §5「note_rich → Tiptap JSON」、Phase 5（メモ欄）実装に合わせる。
-- table_columns.type の check 制約は migration 0001 で既に 'note_rich' を許可済み。

-- ============================================================
-- 今後作成されるPhaseのデフォルト列生成を note_rich に変更
-- ============================================================

create or replace function create_default_table_columns()
returns trigger
language plpgsql
as $$
begin
  insert into table_columns (phase_id, key, label, type, width, sort_order) values
    (new.id, 'checkbox', ' ', 'checkbox', 48, 0),
    (new.id, 'task_name', 'タスク名', 'text', 240, 1),
    (new.id, 'note', '備考', 'note_rich', 320, 2),
    (new.id, 'subtasks', 'サブタスク', 'subtask_list', 240, 3);
  return new;
end;
$$;

-- ============================================================
-- 既存の備考列を note_rich に更新
-- ============================================================

update table_columns
set type = 'note_rich'
where key = 'note' and type = 'text';

-- ============================================================
-- 既存の備考セルの値を {text: "..."} から {doc: TiptapのJSON} へ変換
-- 空文字は空段落ひとつのdocにする
-- ============================================================

update table_cells tc
set value = jsonb_build_object(
  'doc', jsonb_build_object(
    'type', 'doc',
    'content', case
      when coalesce(tc.value ->> 'text', '') = '' then
        jsonb_build_array(jsonb_build_object('type', 'paragraph'))
      else
        jsonb_build_array(jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(jsonb_build_object(
            'type', 'text',
            'text', tc.value ->> 'text'
          ))
        ))
    end
  )
)
from table_columns col
where tc.column_id = col.id
  and col.key = 'note'
  and col.type = 'note_rich'
  and not (tc.value ? 'doc');
