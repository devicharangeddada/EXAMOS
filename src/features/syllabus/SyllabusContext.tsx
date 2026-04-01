import { createContext, useContext, type ReactNode } from 'react';
import { StudyNode, NodeStatus } from '../../types';

export interface SyllabusContextValue {
  nodes: Record<string, StudyNode>;
  nodeCompletions: Record<string, number>;
  activeSubjectId: string | null;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  searchQuery: string;
  updateNodes: (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => void;
  addNode: (parentId: string | null, title?: string) => string;
  deleteNode: (id: string) => void;
  togglePriority: (id: string) => void;
  updateNodeStatus: (id: string, status: NodeStatus) => void;
  toggleExpand: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setActiveSubjectId: (id: string | null) => void;
  setExpandedIds: (next: Set<string>) => void;
  setSearchQuery: (query: string) => void;
  onSelect: (id: string) => void;
  onStartFocus: (id: string) => void;
  onRecall: (id: string) => void;
  setEditingNodeId: (id: string | null) => void;
}

const SyllabusContext = createContext<SyllabusContextValue | null>(null);

export function SyllabusProvider({ value, children }: { value: SyllabusContextValue; children: ReactNode }) {
  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
}

export function useSyllabusContext() {
  const context = useContext(SyllabusContext);
  if (!context) {
    throw new Error('useSyllabusContext must be used within a SyllabusProvider');
  }
  return context;
}
