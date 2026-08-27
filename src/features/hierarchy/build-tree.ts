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
