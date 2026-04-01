import { StudyNode } from '../../types';

export function calculateNodeCompletions(nodes: Record<string, StudyNode>): Record<string, number> {
  const childrenMap = new Map<string, string[]>();
  const completionMap: Record<string, number> = {};

  Object.values(nodes).forEach((node) => {
    childrenMap.set(node.id, []);
  });

  Object.values(nodes).forEach((node) => {
    if (node.parentId) {
      const siblings = childrenMap.get(node.parentId);
      if (siblings) siblings.push(node.id);
      else childrenMap.set(node.parentId, [node.id]);
    }
  });

  const getCompletion = (id: string): number => {
    if (completionMap[id] !== undefined) return completionMap[id];
    const node = nodes[id];
    if (!node) return 0;

    const children = childrenMap.get(id) || [];
    if (children.length === 0) {
      const value = node.completion !== undefined
        ? node.completion
        : node.status === 'done'
          ? 100
          : node.status === 'in-progress'
            ? 50
            : 0;
      completionMap[id] = value;
      return value;
    }

    const total = children.reduce((sum, childId) => sum + getCompletion(childId), 0);
    const average = Math.round(total / children.length);
    completionMap[id] = average;
    return average;
  };

  Object.keys(nodes).forEach(getCompletion);
  return completionMap;
}

export function getRootNodes(nodes: Record<string, StudyNode>) {
  return Object.values(nodes).filter((node) => node.parentId === null);
}
