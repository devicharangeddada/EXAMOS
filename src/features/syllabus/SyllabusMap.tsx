import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, BookOpen, Search, Star, Zap, Play, X } from 'lucide-react';
import { StudyNode, NodeStatus } from '../../types';
import { useHaptics } from '../../lib/haptics';
import { cn } from '../../lib/utils';
import { SyllabusProvider } from './SyllabusContext';
import NeuralNode from './NeuralNode';
import NodePanel from './NodePanel';
import { calculateNodeCompletions, getRootNodes } from './syllabusUtils';

interface SyllabusMapProps {
  nodes: Record<string, StudyNode>;
  updateNodes: (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => void;
  activeNodeId: string | null;
  onStartFocus: (id: string) => void;
  onSelectNode: (id: string) => void;
  onRecall: (id: string) => void;
}

export default function SyllabusMap({ nodes, updateNodes, activeNodeId, onStartFocus, onSelectNode, onRecall }: SyllabusMapProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(activeNodeId);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { pulse } = useHaptics();

  useEffect(() => {
    if (activeNodeId) {
      setSelectedNodeId(activeNodeId);
      setActiveSubjectId(activeNodeId);
      setExpandedIds((prev) => new Set(prev).add(activeNodeId));
    }
  }, [activeNodeId]);

  const nodeCompletions = useMemo(() => calculateNodeCompletions(nodes), [nodes]);

  const rootNodes = useMemo(() => {
    return getRootNodes(nodes).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const effectiveSelectedNodeId = selectedNodeId || activeSubjectId || rootNodes[0]?.id || null;

  useEffect(() => {
    if (!selectedNodeId && !activeSubjectId && rootNodes.length > 0) {
      setSelectedNodeId(rootNodes[0].id);
    }
  }, [rootNodes, selectedNodeId, activeSubjectId]);

  useEffect(() => {
    if (scrollTargetId) {
      const node = nodeRefs.current[scrollTargetId];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setScrollTargetId(null);
    }
  }, [scrollTargetId]);

  const priorityNodes = useMemo(() => Object.values(nodes).filter((n) => n.isPriority), [nodes]);

  const globalStats = useMemo(() => {
    const all = Object.values(nodes);
    const done = all.filter((n) => n.status === 'done').length;
    const pending = all.filter((n) => n.status === 'revise' || n.status === 'in-progress').length;
    const total = all.length;
    const avgComp = total > 0 ? Math.round(all.reduce((acc, n) => acc + (nodeCompletions[n.id] || 0), 0) / total) : 0;
    return { done, pending, avgComp };
  }, [nodes, nodeCompletions]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    setActiveSubjectId(id);
    onSelectNode(id);
  };

  const addNode = (parentId: string | null = null, title?: string) => {
    const id = crypto.randomUUID();
    const newNode: StudyNode = {
      id,
      title: title ?? (parentId ? 'New Topic' : 'New Subject'),
      parentId,
      status: 'not-started',
      notes: [],
      attachments: [],
      order: Object.values(nodes).filter((n) => n.parentId === parentId).length,
      weight: 1,
      failCount: 0,
      focusDifficulty: 0,
      lastInteraction: new Date().toISOString(),
      isPriority: false,
      completion: 0,
    };
    updateNodes((prev) => ({ ...prev, [id]: newNode }));
    setEditingNodeId(id);
    if (parentId) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    }
    return id;
  };

  const handleAddSubject = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSubjectTitle.trim()) return;
    const newId = addNode(null, newSubjectTitle.trim());
    setSelectedNodeId(newId);
    setActiveSubjectId(newId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
    setScrollTargetId(newId);
    pulse('light');
    setNewSubjectTitle('');
    setIsAddingSubject(false);
    onSelectNode(newId);
  };

  const togglePriority = (id: string) => {
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], isPriority: !prev[id].isPriority } }));
  };

  const updateNodeStatus = (id: string, status: NodeStatus) => {
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], status, lastInteraction: new Date().toISOString() } }));
  };

  const deleteNode = (id: string) => {
    updateNodes((prev) => {
      const next = { ...prev };
      const deleteRecursive = (targetId: string) => {
        delete next[targetId];
        Object.values(next).forEach((n) => {
          if (n.parentId === targetId) deleteRecursive(n.id);
        });
      };
      deleteRecursive(id);
      return next;
    });
  };

  const addNote = (nodeId: string, text: string, details?: string) => {
    if (!text.trim()) return;
    updateNodes((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        notes: [
          ...prev[nodeId].notes,
          {
            id: crypto.randomUUID(),
            text,
            details: details || '',
            confidence: 1,
            level: 0,
            streak: 0,
            failCount: 0,
            wrongCount: 0,
            urgencyScore: 0,
            lastSeen: new Date().toISOString(),
            nextDue: new Date().toISOString(),
            leitnerBox: 0,
            lastLeitnerMoveAt: new Date().toISOString(),
            blurting: { attempts: 0 },
          },
        ],
      },
    }));
  };

  const deleteNote = (nodeId: string, noteId: string) => {
    updateNodes((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], notes: prev[nodeId].notes.filter((n) => n.id !== noteId) },
    }));
  };

  const addAttachment = async (nodeId: string, file: File) => {
    const id = crypto.randomUUID();
    const attachment = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    try {
      const { saveFile } = await import('../../lib/storage');
      await saveFile(id, file);
      updateNodes((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          attachments: [...(prev[nodeId].attachments || []), attachment],
        },
      }));
    } catch (error) {
      console.error('Failed to add attachment:', error);
    }
  };

  const deleteAttachment = async (nodeId: string, attachmentId: string) => {
    const { deleteFile } = await import('../../lib/storage');
    await deleteFile(attachmentId);
    updateNodes((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        attachments: (prev[nodeId].attachments || []).filter((a) => a.id !== attachmentId),
      },
    }));
  };

  const contextValue = useMemo(
    () => ({
      nodes,
      nodeCompletions,
      activeSubjectId,
      selectedNodeId,
      expandedIds,
      searchQuery,
      updateNodes,
      addNode,
      deleteNode,
      togglePriority,
      updateNodeStatus,
      toggleExpand,
      setSelectedNodeId,
      setActiveSubjectId,
      setExpandedIds,
      setSearchQuery,
      onSelect: handleSelectNode,
      onStartFocus,
      onRecall,
      setEditingNodeId,
    }),
    [
      nodes,
      nodeCompletions,
      activeSubjectId,
      selectedNodeId,
      expandedIds,
      searchQuery,
      updateNodes,
      addNode,
      deleteNode,
      togglePriority,
      updateNodeStatus,
      onStartFocus,
      onRecall,
      setEditingNodeId,
    ]
  );

  return (
    <SyllabusProvider value={contextValue}>
      <div className="flex flex-col md:flex-row gap-large py-medium">
        <div className="flex-1 space-y-large">
          <div className="surface-card border border-border-color bg-[#131821]/80 p-large shadow-[0_30px_80px_rgba(0,0,0,0.33)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="caption-sm uppercase tracking-[0.32em] text-tertiary">Syllabus Map</p>
                <h2 className="text-[26px] font-semibold tracking-tight text-primary">Neural roadmap for focused mastery</h2>
                <p className="max-w-2xl text-[13px] text-white/65">
                  Navigate your subject hierarchy, spotlight priority work, and launch sessions directly from the map.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddingSubject(true)}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-white/15"
                  type="button"
                >
                  + New Subject
                </button>
                <button
                  onClick={() => addNode(selectedNodeId)}
                  className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[12px] font-medium text-accent transition hover:bg-accent/15"
                  type="button"
                >
                  + New Topic
                </button>
              </div>
            </div>
            {isAddingSubject && (
              <form onSubmit={handleAddSubject} className="mt-4 space-y-small">
                <input
                  autoFocus
                  value={newSubjectTitle}
                  onChange={(e) => setNewSubjectTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  className="w-full rounded-xl border border-border-color bg-[#090A0C]/90 px-4 py-3 text-[14px] text-primary outline-none transition focus:border-accent/50"
                  placeholder="Subject name..."
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 shadow-[0_4px_14px_0_rgba(94,92,230,0.39)] active:scale-95"
                  >
                    Save (Enter)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSubject(false);
                      setNewSubjectTitle('');
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-border-color bg-background px-4 py-2 text-sm text-tertiary transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border-color py-small -mx-medium px-medium flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-medium">
              <div className="flex flex-col">
                <span className="caption-sm text-tertiary">Mastered</span>
                <span className="body-md font-medium tracking-tighter text-primary">{globalStats.done}</span>
              </div>
              <div className="w-px h-8 bg-border-color" />
              <div className="flex flex-col">
                <span className="caption-sm text-tertiary">Pending</span>
                <span className="body-md font-medium tracking-tighter text-primary">{globalStats.pending}</span>
              </div>
              <div className="w-px h-8 bg-border-color" />
              <div className="flex flex-col">
                <span className="caption-sm text-tertiary">Velocity</span>
                <div className="flex items-center gap-nano">
                  <span className="body-md font-medium tracking-tighter text-accent">{globalStats.avgComp}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-small bg-action-light dark:bg-action-dark px-small py-nano rounded-full border border-border-color">
              <Search size={14} className="text-tertiary" />
              <input
                className="bg-transparent border-none outline-none body-md !text-[13px] w-24 sm:w-32"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                aria-label="Search syllabus"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-tertiary hover:text-primary" type="button" aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {priorityNodes.length > 0 && (
            <section className="space-y-small">
              <div className="flex items-center gap-small text-accent">
                <Star size={14} fill="currentColor" />
                <h3 className="caption-sm font-medium tracking-tighter text-accent" style={{ textTransform: 'none', letterSpacing: '-0.01em' }}>
                  Priority Focus
                </h3>
              </div>
              <div className="space-y-nano">
                {priorityNodes.map((node) => (
                  <motion.div
                    key={`priority-${node.id}`}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="surface-card flex items-center justify-between border-l-2 border-accent cursor-pointer hover:brightness-105"
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      onSelectNode(node.id);
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="body-md font-medium tracking-tighter text-primary truncate">{node.title}</span>
                      <span className="caption-sm text-tertiary" style={{ textTransform: 'none' }}>
                        {nodeCompletions[node.id]}% complete
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartFocus(node.id);
                      }}
                      className="p-small bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors"
                      type="button"
                      aria-label={`Start focus on ${node.title}`}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-medium">
            <div className="flex items-center justify-between">
              <h3 className="caption-sm text-tertiary" style={{ letterSpacing: '0.05em' }}>Neural Map</h3>
              <button
                onClick={() => addNode(null)}
                className="flex items-center gap-small text-xs font-medium text-accent hover:opacity-80 transition-opacity"
                type="button"
              >
                <Plus size={14} /> Add Subject
              </button>
            </div>

            <div className="space-y-[2px]">
              {rootNodes.length === 0 ? (
                <div className="surface-card p-large text-center border-dashed border-2 border-border-color">
                  <BookOpen size={40} className="mx-auto mb-small text-tertiary opacity-20" />
                  <p className="body-md text-tertiary">The map is empty. Add your first subject.</p>
                </div>
              ) : (
                rootNodes.map((node) => <NeuralNode key={node.id} node={node} />)
              )}
            </div>
          </section>
        </div>

        <div className="w-full md:w-80 shrink-0">
          <div className="sticky top-[var(--space-medium)] space-y-medium">
            {effectiveSelectedNodeId && nodes[effectiveSelectedNodeId] ? (
              <NodePanel
                node={nodes[effectiveSelectedNodeId]}
                onAddNote={(text, details) => addNote(effectiveSelectedNodeId, text, details)}
                onDeleteNote={(noteId) => deleteNote(effectiveSelectedNodeId, noteId)}
                onStartFocus={() => onStartFocus(effectiveSelectedNodeId)}
                onRecall={() => onRecall(effectiveSelectedNodeId)}
                onAddAttachment={(file) => addAttachment(effectiveSelectedNodeId, file)}
                onDeleteAttachment={(id) => deleteAttachment(effectiveSelectedNodeId, id)}
              />
            ) : (
              <div className="surface-card p-large text-center flex flex-col items-center justify-center h-64 border border-dashed border-border-color">
                <BookOpen size={36} className="mb-[var(--space-v-small)] text-tertiary opacity-20" />
                <p className="body-md text-tertiary">Select a node to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SyllabusProvider>
  );
}
