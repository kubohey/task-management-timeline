import type { GroupRecord, PhaseRecord, ProjectRecord } from "./types";

export interface ProjectNode extends ProjectRecord {
  phases: PhaseRecord[];
}

export interface GroupNode extends GroupRecord {
  subgroups: GroupNode[];
  projects: ProjectNode[];
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

const bySortOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/**
 * groups/projects/phases のフラットな配列から、
 * Group(Subgroup再帰) → Project → Phase の木構造を組み立てる。
 */
export function buildHierarchyTree(
  groups: GroupRecord[],
  projects: ProjectRecord[],
  phases: PhaseRecord[],
): GroupNode[] {
  const projectsByGroup = groupBy(projects, (p) => p.group_id);
  const phasesByProject = groupBy(phases, (p) => p.project_id);
  const groupsByParent = groupBy(groups, (g) => g.parent_group_id);

  const toProjectNode = (project: ProjectRecord): ProjectNode => ({
    ...project,
    phases: (phasesByProject.get(project.id) ?? []).slice().sort(bySortOrder),
  });

  const toGroupNode = (group: GroupRecord): GroupNode => ({
    ...group,
    subgroups: (groupsByParent.get(group.id) ?? [])
      .slice()
      .sort(bySortOrder)
      .map(toGroupNode),
    projects: (projectsByGroup.get(group.id) ?? [])
      .slice()
      .sort(bySortOrder)
      .map(toProjectNode),
  });

  return (groupsByParent.get(null) ?? []).slice().sort(bySortOrder).map(toGroupNode);
}

/**
 * 木構造（buildHierarchyTreeの結果）から、Projectだけを
 * Group（Subgroup再帰、サブグループ→自分のProjectの順）の深さ優先順で取り出す。
 * サイドバーの表示順と同じ並び。ロードマップの検索系ピッカー（AddRoadmapColumnButton・
 * RoadmapTaskPicker）で、Project/Phaseの候補を「Group→Project→Phase」の階層順に
 * 並べるために使う（ユーザー報告：「検索候補がランダム表示になっている」。
 * sort_orderは親ごとにローカルな値のため、projectsテーブル単体を素直にorderしても、
 * 異なるGroupのProjectが混ざり合ってしまい階層順にはならない）。
 * 返すのは`ProjectNode`（`.phases`もsort_order順で持つ）なので、呼び出し側で
 * Phaseの並びも別途組み立て直す必要はない。
 */
export function flattenProjectsInHierarchyOrder(tree: GroupNode[]): ProjectNode[] {
  const out: ProjectNode[] = [];
  const visit = (group: GroupNode) => {
    for (const subgroup of group.subgroups) {
      visit(subgroup);
    }
    out.push(...group.projects);
  };
  for (const group of tree) {
    visit(group);
  }
  return out;
}
