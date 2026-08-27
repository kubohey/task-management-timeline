-- Task Management Timeline: Projectタブの背景色編集に対応
-- docs/spec.md §2.1「Group / Subgroup / Project タブの背景色は自由に変更可能」

alter table projects add column if not exists color text;
