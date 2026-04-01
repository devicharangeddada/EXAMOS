import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudyNode, NodeStatus } from '../types';
import { calculateSubjectProgress } from '../lib/brain';
import { useHaptics } from '../lib/haptics';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Play,
  Star,
  Search,
  Zap,
  Target,
  BookOpen,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import React from 'react';
import { cn } from '../lib/utils';
import MediaOverlay from './MediaOverlay';

interface SyllabusProps {
  nodes: Record<string, StudyNode>;
  updateNodes: (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => void;
  activeNodeId: string | null;
  onStartFocus: (id: string) => void;
  onSelectNode: (id: string) => void;
  onRecall: (id: string) => void;
}

/** Minimal sparkline SVG rendered from last 6 data points */
function VelocitySparkline({ value }: { value: number }) {
  const points = useMemo(() => {
    // Synthesise fake velocity curve ending at current value
    const base = Math.max(0, value - 40);
    const pts = [base, base + 8, base + 15, base + 22, base + 30, value].map(v => Math.min(100, Math.max(0, v)));
    return pts;
  }, [value]);

  const w = 40, h = 14;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - (v / 100) * h);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60 shrink-0">
      <path d={d} fill="none" stroke="rgba(74,144,226,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2" fill="rgba(74,144,226,1)" />
    </svg>
  );
}

export default function Syllabus({ nodes, updateNodes, activeNodeId, onStartFocus, onSelectNode, onRecall }: SyllabusProps) {
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

  const registerNodeRef = (id: string, node: HTMLDivElement | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  useEffect(() => {
    if (activeNodeId) {
      setSelectedNodeId(activeNodeId);
      setActiveSubjectId(activeNodeId);
      setExpandedIds((prev) => new Set(prev).add(activeNodeId));
    }
  }, [activeNodeId]);

  const getDescendantTopics = (id: string): StudyNode[] => {
    const children = Object.values(nodes).filter(n => n.parentId === id);
    if (children.length === 0) {
      return nodes[id] ? [nodes[id]] : [];
    }
    return children.flatMap((child) => getDescendantTopics(child.id));
  };

  const nodeCompletions = useMemo(() => {
    const completions: Record<string, number> = {};
    const getComp = (id: string): number => {
      if (completions[id] !== undefined) return completions[id];
      const node = nodes[id];
      if (!node) return 0;
      const children = Object.values(nodes).filter(n => n.parentId === id);
      if (children.length === 0) {
        const val = node.completion !== undefined
          ? node.completion
          : node.status === 'done'
            ? 100
            : node.status === 'in-progress'
              ? 50
              : 0;
        completions[id] = val;
        return val;
      }
      const descendantTopics = getDescendantTopics(id);
      const val = calculateSubjectProgress(descendantTopics);
      completions[id] = val;
      return val;
    };
    Object.keys(nodes).forEach(getComp);
    return completions;
  }, [nodes]);

  const rootNodes = useMemo(() => {
    return Object.values(nodes)
      .filter(n => n.parentId === null)
      .sort((a, b) => a.order - b.order);
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

  const priorityNodes = useMemo(() => Object.values(nodes).filter(n => n.isPriority), [nodes]);

  const globalStats = useMemo(() => {
    const all = Object.values(nodes);
    const done = all.filter(n => n.status === 'done').length;
    const pending = all.filter(n => n.status === 'revise' || n.status === 'in-progress').length;
    const total = all.length;
    const avgComp = total > 0 ? Math.round(all.reduce((acc, n) => acc + (nodeCompletions[n.id] || 0), 0) / total) : 0;
    return { done, pending, avgComp };
  }, [nodes, nodeCompletions]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
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
      order: Object.values(nodes).filter(n => n.parentId === parentId).length,
      weight: 1,
      failCount: 0,
      focusDifficulty: 0,
      lastInteraction: new Date().toISOString(),
      isPriority: false,
      completion: 0,
    };
    updateNodes(prev => ({ ...prev, [id]: newNode }));
    setEditingNodeId(id);
    if (parentId) {
      const next = new Set(expandedIds);
      next.add(parentId);
      setExpandedIds(next);
    }
    return id;
  };

  const handleAddSubject = (e: React.FormEvent<HTMLFormElement>) => {
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
    updateNodes(prev => ({ ...prev, [id]: { ...prev[id], isPriority: !prev[id].isPriority } }));
  };

  const updateNodeStatus = (id: string, status: NodeStatus) => {
    updateNodes(prev => ({ ...prev, [id]: { ...prev[id], status, lastInteraction: new Date().toISOString() } }));
  };

  const deleteNode = (id: string) => {
    updateNodes(prev => {
      const next = { ...prev };
      const deleteRecursive = (targetId: string) => {
        delete next[targetId];
        Object.values(next).forEach(n => { if (n.parentId === targetId) deleteRecursive(n.id); });
      };
      deleteRecursive(id);
      return next;
    });
  };

  const addNote = (nodeId: string, text: string, details?: string) => {
    if (!text.trim()) return;
    updateNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        notes: [...prev[nodeId].notes, {
          id: Math.random().toString(36).substring(7), text, details: details || '',
          confidence: 1, level: 0, streak: 0, failCount: 0, wrongCount: 0, urgencyScore: 0,
          lastSeen: new Date().toISOString(), nextDue: new Date().toISOString(),
          leitnerBox: 0, lastLeitnerMoveAt: new Date().toISOString(), blurting: { attempts: 0 }
        }]
      }
    }));
  };

  const deleteNote = (nodeId: string, noteId: string) => {
    updateNodes(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], notes: prev[nodeId].notes.filter(n => n.id !== noteId) }
    }));
  };

  const addAttachment = async (nodeId: string, file: File) => {
    const id = Math.random().toString(36).substring(7);
    const attachment = { id, name: file.name, type: file.type, size: file.size, createdAt: new Date().toISOString() };
    try {
      const { saveFile } = await import('../lib/storage');
      await saveFile(id, file);
      updateNodes(prev => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], attachments: [...(prev[nodeId].attachments || []), attachment] }
      }));
    } catch (error) {
      console.error('Failed to add attachment:', error);
    }
  };

  const deleteAttachment = async (nodeId: string, attachmentId: string) => {
    const { deleteFile } = await import('../lib/storage');
    await deleteFile(attachmentId);
    updateNodes(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], attachments: (prev[nodeId].attachments || []).filter(a => a.id !== attachmentId) }
    }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-large py-medium">
      {/* Neural Map Tree */}
      <div className="flex-1 space-y-large">
        {/* Map Hero */}
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
              >
                + New Subject
              </button>
              <button
                onClick={() => addNode(selectedNodeId)}
                className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[12px] font-medium text-accent transition hover:bg-accent/15"
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
                  onClick={() => { setIsAddingSubject(false); setNewSubjectTitle(''); }}
                  className="inline-flex items-center justify-center rounded-xl border border-border-color bg-background px-4 py-2 text-sm text-tertiary transition hover:border-white/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Top Bar */}
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
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-tertiary hover:text-primary">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Priority Focus Layer */}
        {priorityNodes.length > 0 && (
          <section className="space-y-small">
            <div className="flex items-center gap-small text-accent">
              <Star size={14} fill="currentColor" />
              <h3 className="caption-sm font-medium tracking-tighter text-accent" style={{ textTransform: 'none', letterSpacing: '-0.01em' }}>Priority Focus</h3>
            </div>
            <div className="space-y-nano">
              {priorityNodes.map(node => (
                <motion.div
                  key={`priority-${node.id}`}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="surface-card flex items-center justify-between border-l-2 border-accent cursor-pointer hover:brightness-105"
                  onClick={() => { setSelectedNodeId(node.id); onSelectNode(node.id); }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="body-md font-medium tracking-tighter text-primary truncate">{node.title}</span>
                    <span className="caption-sm text-tertiary" style={{ textTransform: 'none' }}>{nodeCompletions[node.id]}% complete</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartFocus(node.id); }}
                    className="p-small bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Neural Map */}
        <section className="space-y-medium">
          <div className="flex items-center justify-between">
            <h3 className="caption-sm text-tertiary" style={{ letterSpacing: '0.05em' }}>Neural Map</h3>
            <button
              onClick={() => addNode(null)}
              className="flex items-center gap-small text-xs font-medium text-accent hover:opacity-80 transition-opacity"
            >
              <Plus size={14} />
              Add Subject
            </button>
          </div>

          <div className="space-y-[2px]">
            {rootNodes.length === 0 ? (
              <div className="surface-card p-large text-center border-dashed border-2 border-border-color">
                <BookOpen size={40} className="mx-auto mb-small text-tertiary opacity-20" />
                <p className="body-md text-tertiary">The map is empty. Add your first subject.</p>
              </div>
            ) : (
              rootNodes.map((node, idx) => (
                <NeuralNode
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  nodeCompletions={nodeCompletions}
                  onStartFocus={onStartFocus}
                  onSelectNode={handleSelectNode}
                  onRecall={onRecall}
                  updateNodes={updateNodes}
                  togglePriority={togglePriority}
                  updateNodeStatus={updateNodeStatus}
                  deleteNode={deleteNode}
                  editingNodeId={editingNodeId}
                  setEditingNodeId={setEditingNodeId}
                  searchQuery={searchQuery}
                  addNode={addNode}
                  activeSubjectId={activeSubjectId}
                  selectedNodeId={selectedNodeId}
                  setNodeRef={registerNodeRef}
                  isLast={idx === rootNodes.length - 1}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Right: Node Panel */}
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
  );
}

interface NeuralNodeProps {
  key?: React.Key;
  node: StudyNode;
  nodes: Record<string, StudyNode>;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  nodeCompletions: Record<string, number>;
  onStartFocus: (id: string) => void;
  onSelectNode: (id: string) => void;
  onRecall: (id: string) => void;
  updateNodes: (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => void;
  togglePriority: (id: string) => void;
  updateNodeStatus: (id: string, status: NodeStatus) => void;
  deleteNode: (id: string) => void;
  editingNodeId: string | null;
  setNodeRef?: (id: string, node: HTMLDivElement | null) => void;
  setEditingNodeId: (id: string | null) => void;
  searchQuery: string;
  addNode: (parentId: string | null) => void;
  activeSubjectId: string | null;
  selectedNodeId: string | null;
  level?: number;
  isLast?: boolean;
}

function NeuralNode({
  node, nodes, expandedIds, toggleExpand, nodeCompletions,
  onStartFocus, onSelectNode, onRecall, updateNodes, togglePriority,
  updateNodeStatus, deleteNode, editingNodeId, setEditingNodeId,
  searchQuery, addNode, activeSubjectId, selectedNodeId, setNodeRef,
  level = 0, isLast = false
}: NeuralNodeProps) {
  const children = useMemo(() => {
    return Object.values(nodes)
      .filter(n => n.parentId === node.id)
      .sort((a, b) => a.order - b.order);
  }, [nodes, node.id]);

  const isExpanded = expandedIds.has(node.id);
  const completion = nodeCompletions[node.id] || 0;
  const isElite = completion === 100;
  const isSelected = selectedNodeId === node.id;

  const matchesSearch = searchQuery === '' || node.title.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChild = useMemo(() => {
    const check = (id: string): boolean => {
      const n = nodes[id];
      if (!n) return false;
      if (n.title.toLowerCase().includes(searchQuery.toLowerCase())) return true;
      return Object.values(nodes).filter(c => c.parentId === id).some(c => check(c.id));
    };
    return searchQuery !== '' && check(node.id);
  }, [nodes, node.id, searchQuery]);

  const isDimmed = searchQuery !== '' && !matchesSearch && !hasMatchingChild;
  // Progressive disclosure: dim inactive subjects at root level
  const isInactive = level === 0 && activeSubjectId !== null && activeSubjectId !== node.id && searchQuery === '';

  const statusColor = node.status === 'done' ? '#34C759' : node.status === 'in-progress' ? '#FF9F0A' : 'var(--text-tertiary)';
  const connectorStartX = Math.max(18, 24 - level * 4);
  const connectorPath = `M${connectorStartX} 4 C${connectorStartX} 4, 10 4, 10 18`;

  return (
    <motion.div
      layout
      className={cn(
        "relative transition-opacity duration-500",
        isDimmed ? "opacity-20" : isInactive ? "opacity-40" : "opacity-100"
      )}
    >
      {/* L-shaped Apple-style connector: horizontal arm from vertical border to this node */}
      {level > 0 && (
        <motion.svg layout className="absolute left-[-20px] top-[12px] w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
          <path d={connectorPath} fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 18 L10 28" fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      )}

      {/* Node Card */}
      <motion.div
        ref={(el) => setNodeRef?.(node.id, el)}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "group relative flex flex-col rounded-xl cursor-pointer border",
          "transition-all duration-500",
          level === 0 ? "p-small mb-[2px]" : "p-[10px] mb-[2px]",
          isElite && "elite-node",
          !isElite && "border-transparent",
          isSelected && "border-accent/60 bg-accent/10 shadow-[0_0_28px_rgba(108,140,255,0.14)]",
          isExpanded
            ? "bg-black/[0.03] dark:bg-white/[0.03]"
            : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        )}
        onClick={() => {
          toggleExpand(node.id);
          onSelectNode(node.id);
        }}
        style={isElite ? {} : {}}
      >
        <div className="flex items-center gap-small">
          {/* Glowing status dot */}
          <div
            className="w-2 h-2 rounded-full shrink-0 transition-all duration-500"
            style={{
              backgroundColor: statusColor,
              boxShadow: node.status === 'done'
                ? '0 0 6px rgba(52,199,89,0.6)'
                : node.status === 'in-progress'
                ? '0 0 6px rgba(255,159,10,0.6)'
                : 'none'
            }}
          />

          {/* Title + Completion */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-small">
              {editingNodeId === node.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none body-md font-medium tracking-tighter text-primary"
                  defaultValue={node.title}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    updateNodes(prev => ({ ...prev, [node.id]: { ...prev[node.id], title: e.target.value } }));
                    setEditingNodeId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateNodes(prev => ({ ...prev, [node.id]: { ...prev[node.id], title: e.currentTarget.value } }));
                      setEditingNodeId(null);
                    }
                  }}
                />
              ) : (
                <span className={cn(
                  "truncate tracking-tighter font-medium",
                  level === 0 ? "text-[16px] text-primary" : "text-[14px] text-secondary"
                )}>
                  {node.title}
                  {isElite && (
                    <span className="ml-1 text-[10px]" style={{ color: 'rgba(253,196,45,0.9)' }}>★</span>
                  )}
                </span>
              )}

              <div className="flex items-center gap-[6px] shrink-0">
                {/* Velocity sparkline */}
                <VelocitySparkline value={completion} />
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  isElite ? "text-yellow-400" : "text-tertiary"
                )}>{completion}%</span>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePriority(node.id); }}
                  className={cn("p-nano transition-colors", node.isPriority ? "text-accent" : "text-tertiary/30 hover:text-accent")}
                >
                  <Star size={12} fill={node.isPriority ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-[5px] w-full h-[3px] rounded-full overflow-hidden"
              style={{ background: 'var(--border-color)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{
                  background: isElite
                    ? 'linear-gradient(90deg, #F59E0B, #FDE047)'
                    : 'var(--color-accent)'
                }}
              />
            </div>
          </div>

          {children.length > 0 && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-tertiary/40"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </motion.div>
          )}
        </div>

        {/* Control strip — appears on expand */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-small pt-small pb-[2px]">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => onStartFocus(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano bg-accent text-white rounded-lg text-[11px] font-medium hover:opacity-90"
                >
                  <Play size={11} fill="currentColor" />
                  Focus
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => onRecall(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano rounded-lg text-[11px] font-medium border border-border-color bg-action-light dark:bg-action-dark text-primary"
                >
                  <Zap size={11} />
                  Recall
                </motion.button>
                <div className="flex items-center gap-nano bg-action-light dark:bg-action-dark p-nano rounded-lg border border-border-color">
                  {(['not-started', 'in-progress', 'done'] as NodeStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => updateNodeStatus(node.id, s)}
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-md transition-all",
                        node.status === s ? "bg-white dark:bg-black shadow-sm text-accent" : "text-tertiary hover:text-primary"
                      )}
                    >
                      {s === 'done' ? <CheckCircle2 size={11} /> : s === 'in-progress' ? <Clock size={11} /> : <Target size={11} />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-nano">
                  <button onClick={() => addNode(node.id)} className="p-nano text-tertiary hover:text-primary"><Plus size={13} /></button>
                  <button onClick={() => setEditingNodeId(node.id)} className="p-nano text-tertiary hover:text-primary"><Edit3 size={13} /></button>
                  <button onClick={() => deleteNode(node.id)} className="p-nano text-tertiary hover:text-error"><Trash2 size={13} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Children: nested with vertical connector */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="ml-[22px] pl-[12px] relative overflow-visible"
            style={{ borderLeft: '1px solid rgba(74,144,226,0.2)' }}
          >
            {children.map((child, idx) => (
              <NeuralNode
                key={child.id}
                node={child}
                nodes={nodes}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                nodeCompletions={nodeCompletions}
                onStartFocus={onStartFocus}
                onSelectNode={onSelectNode}
                onRecall={onRecall}
                updateNodes={updateNodes}
                togglePriority={togglePriority}
                updateNodeStatus={updateNodeStatus}
                deleteNode={deleteNode}
                editingNodeId={editingNodeId}
                setEditingNodeId={setEditingNodeId}
                searchQuery={searchQuery}
                addNode={addNode}
                activeSubjectId={activeSubjectId}
                selectedNodeId={selectedNodeId}
                setNodeRef={setNodeRef}
                level={level + 1}
                isLast={idx === children.length - 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────── NodePanel ─────────── */
interface NodePanelProps {
  node: StudyNode;
  onAddNote: (text: string, details?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onStartFocus: () => void;
  onRecall: () => void;
  onAddAttachment: (file: File) => void;
  onDeleteAttachment: (id: string) => void;
}

function NodePanel({ node, onAddNote, onDeleteNote, onStartFocus, onRecall, onAddAttachment, onDeleteAttachment }: NodePanelProps) {
  const [noteText, setNoteText] = useState('');
  const [noteDetails, setNoteDetails] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const noteReady = noteText.trim().length > 0 && noteDetails.trim().length > 0;

  const handleSubmitNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noteReady || isSaving) return;
    setIsSaving(true);
    onAddNote(noteText.trim(), noteDetails.trim());
    setNoteText('');
    setNoteDetails('');
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSaving(false);
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 1500);
  };

  return (
    <div className="surface-card space-y-medium">
      {/* Header */}
      <div className="space-y-nano">
        <p className="text-[18px] font-medium tracking-tighter text-primary leading-tight">{node.title}</p>
        <div className="flex gap-small">
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={onStartFocus}
            className="flex-1 flex items-center justify-center gap-nano primary-button !rounded-xl !h-9 text-[12px]"
          >
            <Play size={13} fill="currentColor" /> Focus
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={onRecall}
            className="flex-1 flex items-center justify-center gap-nano secondary-button !rounded-xl !h-9 text-[12px]"
          >
            <Zap size={13} /> Recall
          </motion.button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-small">
        <p className="caption-sm text-tertiary">Notes</p>
        <div className="space-y-nano max-h-48 overflow-y-auto pr-1">
          {node.notes.length === 0 && (
            <p className="text-[12px] text-tertiary italic">No notes yet.</p>
          )}
          {node.notes.map(note => (
            <div key={note.id} className="group flex items-start gap-nano bg-action-light dark:bg-action-dark rounded-lg px-small py-nano">
              <p className="flex-1 text-[12px] text-primary">{note.text}</p>
              <button
                onClick={() => onDeleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-tertiary hover:text-error"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <form className="space-y-nano" onSubmit={handleSubmitNote}>
        <input
          className="w-full bg-action-light dark:bg-action-dark rounded-lg px-small py-nano text-[12px] text-primary border border-border-color outline-none focus:border-accent/50 transition-colors"
          placeholder="Note title"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <input
          className="w-full bg-action-light dark:bg-action-dark rounded-lg px-small py-nano text-[11px] text-secondary border border-border-color outline-none focus:border-accent/50 transition-colors"
          placeholder="Note description"
          value={noteDetails}
          onChange={(e) => setNoteDetails(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={!noteReady || isSaving}
          className={`w-full mt-small inline-flex items-center justify-center gap-nano rounded-xl bg-accent text-white px-medium py-3 text-[12px] font-medium transition-all ${noteReady && !isSaving ? 'hover:brightness-110 shadow-[0_4px_14px_0_rgba(94,92,230,0.39)] active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Note'}
          {saveSuccess ? <CheckCircle2 size={14} /> : <Plus size={14} />}
        </button>
      </form>
    </div>

      {/* Attachments */}
      <div className="space-y-nano">
        <div className="flex items-center justify-between">
          <p className="caption-sm text-tertiary">Files</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-accent hover:opacity-80 flex items-center gap-nano"
          >
            <Plus size={11} /> Attach
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAddAttachment(f);
            e.target.value = '';
          }} />
        </div>
        {(node.attachments || []).map(a => (
          <div key={a.id} className="flex items-center gap-nano bg-action-light dark:bg-action-dark rounded-lg px-small py-nano">
            <span className="flex-1 text-[11px] text-primary truncate">{a.name}</span>
            <button onClick={() => onDeleteAttachment(a.id)} className="text-tertiary hover:text-error">
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Study Methods */}
      <div className="space-y-nano pt-nano border-t border-border-color">
        <p className="caption-sm text-tertiary">Study Methods</p>
        <div className="flex gap-nano flex-wrap">
          {['Leitner', 'Feynman', 'SQ3R'].map(method => (
            <span key={method} className="text-[10px] px-[8px] py-[3px] rounded-full border border-border-color text-secondary font-medium">{method}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

