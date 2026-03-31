import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudyNode, NodeStatus } from '../types';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
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
  Brain,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  X,
  ArrowRight
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

export default function Syllabus({ nodes, updateNodes, activeNodeId, onStartFocus, onSelectNode, onRecall }: SyllabusProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(activeNodeId);

  // Parent-Child Roll-up Logic
  const nodeCompletions = useMemo(() => {
    const completions: Record<string, number> = {};
    
    const getComp = (id: string): number => {
      if (completions[id] !== undefined) return completions[id];
      const node = nodes[id];
      if (!node) return 0;
      const children = Object.values(nodes).filter(n => n.parentId === id);
      
      if (children.length === 0) {
        const val = node.status === 'done' ? 100 : node.status === 'in-progress' ? 50 : 0;
        completions[id] = val;
        return val;
      }
      
      const totalWeight = children.length;
      const sum = children.reduce((acc, child) => acc + getComp(child.id), 0);
      const val = Math.round(sum / totalWeight);
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

  const priorityNodes = useMemo(() => {
    return Object.values(nodes).filter(n => n.isPriority);
  }, [nodes]);

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

  const addNode = (parentId: string | null = null) => {
    const id = Math.random().toString(36).substring(7);
    const newNode: StudyNode = {
      id,
      title: parentId ? 'New Topic' : 'New Subject',
      parentId,
      status: 'not-started',
      notes: [],
      order: Object.values(nodes).filter(n => n.parentId === parentId).length,
      weight: 1,
      failCount: 0,
      focusDifficulty: 0,
      lastInteraction: new Date().toISOString(),
      isPriority: false,
      completion: 0,
      attachments: []
    };
    updateNodes(prev => ({ ...prev, [id]: newNode }));
    setEditingNodeId(id);
    if (parentId) {
      const next = new Set(expandedIds);
      next.add(parentId);
      setExpandedIds(next);
    }
  };

  const togglePriority = (id: string) => {
    updateNodes(prev => ({
      ...prev,
      [id]: { ...prev[id], isPriority: !prev[id].isPriority }
    }));
  };

  const updateNodeStatus = (id: string, status: NodeStatus) => {
    updateNodes(prev => ({
      ...prev,
      [id]: { ...prev[id], status, lastInteraction: new Date().toISOString() }
    }));
  };

  const deleteNode = (id: string) => {
    updateNodes(prev => {
      const next = { ...prev };
      const deleteRecursive = (targetId: string) => {
        delete next[targetId];
        Object.values(next).forEach(n => {
          if (n.parentId === targetId) deleteRecursive(n.id);
        });
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
          id: Math.random().toString(36).substring(7), 
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
          blurting: { attempts: 0 }
        }]
      }
    }));
  };

  const deleteNote = (nodeId: string, noteId: string) => {
    updateNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        notes: prev[nodeId].notes.filter(n => n.id !== noteId)
      }
    }));
  };

  const addAttachment = async (nodeId: string, file: File) => {
    const id = Math.random().toString(36).substring(7);
    const attachment = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    };

    try {
      // Save to IndexedDB
      const { saveFile } = await import('../lib/storage');
      await saveFile(id, file);

      updateNodes(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          attachments: [...(prev[nodeId].attachments || []), attachment]
        }
      }));
      
      // Feedback
      console.log('File added:', file.name);
    } catch (error) {
      console.error('Failed to add attachment:', error);
    }
  };

  const deleteAttachment = async (nodeId: string, attachmentId: string) => {
    const { deleteFile } = await import('../lib/storage');
    await deleteFile(attachmentId);

    updateNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        attachments: (prev[nodeId].attachments || []).filter(a => a.id !== attachmentId)
      }
    }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-large py-medium">
      {/* Left: Tree View */}
      <div className="flex-1 space-y-large">
        {/* Sticky Top Bar: Global Stats */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border-color py-small -mx-medium px-medium flex items-center justify-between">
          <div className="flex gap-medium">
            <div className="flex flex-col">
              <span className="caption-sm text-tertiary">Total Done</span>
              <span className="body-md font-bold text-primary">{globalStats.done}</span>
            </div>
            <div className="w-px h-8 bg-border-color" />
            <div className="flex flex-col">
              <span className="caption-sm text-tertiary">Pending</span>
              <span className="body-md font-bold text-primary">{globalStats.pending}</span>
            </div>
            <div className="w-px h-8 bg-border-color" />
            <div className="flex flex-col">
              <span className="caption-sm text-tertiary">Velocity</span>
              <div className="flex items-center gap-nano">
                <span className="body-md font-bold text-accent">{globalStats.avgComp}%</span>
                <div className="w-10 h-4 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-emerald-400/60 via-accent/60 to-amber-300/70 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-small bg-action-light dark:bg-action-dark px-small py-nano rounded-full border border-border-color">
            <Search size={14} className="text-tertiary" />
            <input 
              className="bg-transparent border-none outline-none body-md !text-[13px] w-24 sm:w-32"
              placeholder="Fuzzy Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Priority Focus Layer */}
        {priorityNodes.length > 0 && (
          <section className="space-y-small">
            <div className="flex items-center gap-small text-accent">
              <Star size={16} fill="currentColor" />
              <h3 className="caption-sm font-bold uppercase tracking-wider">Priority Focus</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-small">
              {priorityNodes.map(node => (
                <div 
                  key={`priority-${node.id}`}
                  className="surface-card p-small flex items-center justify-between border-l-2 border-accent hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    onSelectNode(node.id);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="body-md font-bold text-primary truncate">{node.title}</span>
                    <span className="caption-sm text-tertiary">{nodeCompletions[node.id]}% Complete</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onStartFocus(node.id); }}
                    className="p-small bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Syllabus Tree */}
        <section className="space-y-medium">
          <div className="flex items-center justify-between">
            <h3 className="caption-sm font-bold text-tertiary uppercase tracking-wider">Live Navigation Map</h3>
            <button 
              onClick={() => addNode(null)}
              className="flex items-center gap-small text-xs font-bold text-accent hover:opacity-80 transition-opacity"
            >
              <Plus size={14} />
              Add Subject
            </button>
          </div>

          <div className="space-y-nano">
            {rootNodes.length === 0 ? (
              <div className="surface-card p-large text-center border-dashed border-2 border-border-color">
                <BookOpen size={48} className="mx-auto mb-small text-tertiary opacity-20" />
                <p className="body-md text-tertiary">The path is clear. Add your first subject to begin.</p>
              </div>
            ) : (
              rootNodes.map(node => (
                <NodeItem 
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  nodeCompletions={nodeCompletions}
                  onStartFocus={onStartFocus}
                  onSelectNode={(id) => {
                    setSelectedNodeId(id);
                    onSelectNode(id);
                  }}
                  onRecall={onRecall}
                  updateNodes={updateNodes}
                  togglePriority={togglePriority}
                  updateNodeStatus={updateNodeStatus}
                  deleteNode={deleteNode}
                  editingNodeId={editingNodeId}
                  setEditingNodeId={setEditingNodeId}
                  searchQuery={searchQuery}
                  addNode={addNode}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Right: Node Panel */}
      <div className="w-full md:w-80 shrink-0">
        <div className="sticky top-[var(--space-medium)] space-y-medium">
          {selectedNodeId && nodes[selectedNodeId] ? (
            <NodePanel 
              node={nodes[selectedNodeId]} 
              onAddNote={(text, details) => addNote(selectedNodeId, text, details)}
              onDeleteNote={(noteId) => deleteNote(selectedNodeId, noteId)}
              onStartFocus={() => onStartFocus(selectedNodeId)}
              onRecall={() => onRecall(selectedNodeId)}
              onAddAttachment={(file) => addAttachment(selectedNodeId, file)}
              onDeleteAttachment={(id) => deleteAttachment(selectedNodeId, id)}
            />
          ) : (
            <div className="surface-card p-large text-center flex flex-col items-center justify-center h-64 border border-dashed border-border-color">
              <BookOpen size={48} className="mb-[var(--space-v-small)] text-tertiary opacity-20" />
              <p className="body-md text-tertiary">Select a topic to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NodeItemProps {
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
  setEditingNodeId: (id: string | null) => void;
  searchQuery: string;
  addNode: (parentId: string | null) => void;
  level?: number;
  key?: any;
}

function NodeItem({ 
  node, nodes, expandedIds, toggleExpand, nodeCompletions, 
  onStartFocus, onSelectNode, onRecall, updateNodes, togglePriority, 
  updateNodeStatus, deleteNode, editingNodeId, setEditingNodeId,
  searchQuery, addNode, level = 0 
}: NodeItemProps) {
  const children = useMemo(() => {
    return Object.values(nodes)
      .filter(n => n.parentId === node.id)
      .sort((a, b) => a.order - b.order);
  }, [nodes, node.id]);

  const isExpanded = expandedIds.has(node.id);
  const completion = nodeCompletions[node.id] || 0;
  
  const matchesSearch = searchQuery === '' || node.title.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChild = useMemo(() => {
    const check = (id: string): boolean => {
      const n = nodes[id];
      if (n.title.toLowerCase().includes(searchQuery.toLowerCase())) return true;
      const childs = Object.values(nodes).filter(c => c.parentId === id);
      return childs.some(c => check(c.id));
    };
    return searchQuery !== '' && check(node.id);
  }, [nodes, node.id, searchQuery]);

  const isDimmed = searchQuery !== '' && !matchesSearch && !hasMatchingChild;

  return (
    <div className={cn("transition-opacity duration-300", isDimmed ? "opacity-20" : "opacity-100")}>
      <div 
        className={cn(
          "group relative flex flex-col p-small rounded-xl transition-all cursor-pointer border border-transparent",
          isExpanded ? "bg-black/[0.02] dark:bg-white/[0.02]" : "hover:bg-black/[0.01] dark:hover:bg-white/[0.01]",
          completion === 100 && level === 0 && "border-amber-300/60 shadow-[0_0_25px_rgba(253,224,71,0.25)]"
        )}
        onClick={() => toggleExpand(node.id)}
      >
        <div className="flex items-center gap-small">
          {/* Status Dot (Traffic Light) */}
          <div 
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0 transition-colors",
              node.status === 'done' ? "bg-success" : 
              node.status === 'in-progress' ? "bg-warning" : 
              "bg-tertiary/30"
            )} 
          />

          {/* Title & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-small">
              {editingNodeId === node.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none body-md font-bold text-primary"
                  defaultValue={node.title}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const title = e.target.value;
                    updateNodes(prev => ({ ...prev, [node.id]: { ...prev[node.id], title } }));
                    setEditingNodeId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const title = e.currentTarget.value;
                      updateNodes(prev => ({ ...prev, [node.id]: { ...prev[node.id], title } }));
                      setEditingNodeId(null);
                    }
                  }}
                />
              ) : (
                <span className={cn(
                  "body-md truncate",
                  level === 0 ? "font-bold text-primary text-[16px]" : "font-medium text-secondary text-[14px]"
                )}>
                  {node.title}
                </span>
              )}
              
              <div className="flex items-center gap-nano shrink-0">
                {node.notes.length > 0 && (
                  <div className="flex items-center gap-nano px-small py-[2px] bg-accent/10 text-accent rounded-full text-[10px] font-bold">
                    <span>{node.notes.length}</span>
                    <Zap size={10} fill="currentColor" />
                  </div>
                )}
                <span className="caption-sm text-tertiary font-bold">{completion}%</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePriority(node.id); }}
                  className={cn("p-nano transition-colors", node.isPriority ? "text-accent" : "text-tertiary/40 hover:text-accent")}
                >
                  <Star size={14} fill={node.isPriority ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="mt-nano w-full h-[4px] bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                className="h-full bg-accent"
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <div className="text-tertiary group-hover:text-primary transition-colors">
            {children.length > 0 && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </div>
        </div>

        {/* Quick-Action Surface (Control Strip) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-small pt-small pb-nano">
                <button 
                  onClick={() => onStartFocus(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano bg-accent text-white rounded-lg text-[12px] font-bold hover:opacity-90 transition-opacity"
                >
                  <Play size={12} fill="currentColor" />
                  Focus
                </button>
                <button 
                  onClick={() => onSelectNode(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano bg-action-light dark:bg-action-dark text-primary rounded-lg text-[12px] font-bold border border-border-color hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                >
                  <Zap size={12} />
                  Recall
                </button>
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
                      {s === 'done' ? <CheckCircle2 size={12} /> : s === 'in-progress' ? <Clock size={12} /> : <Target size={12} />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-nano">
                  <button onClick={() => addNode(node.id)} className="p-nano text-tertiary hover:text-primary"><Plus size={14} /></button>
                  <button onClick={() => setEditingNodeId(node.id)} className="p-nano text-tertiary hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => deleteNode(node.id)} className="p-nano text-tertiary hover:text-error"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nested Levels */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-[var(--space-medium)] border-l border-accent/10 pl-nano"
          >
            {children.map(child => (
              <NodeItem 
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
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NodePanel({ node, onAddNote, onDeleteNote, onStartFocus, onRecall, onAddAttachment, onDeleteAttachment }: { 
  node: StudyNode, 
  onAddNote: (text: string, details?: string) => void,
  onDeleteNote: (id: string) => void,
  onStartFocus: () => void,
  onRecall: () => void,
  onAddAttachment: (file: File) => void,
  onDeleteAttachment: (id: string) => void
}) {
  const [noteInput, setNoteInput] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isVaultExpanded, setIsVaultExpanded] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ id: string, name: string, type: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const attachments = node.attachments || [];
  const pdfCount = attachments.filter(a => a.type === 'application/pdf').length;
  const imgCount = attachments.filter(a => a.type.startsWith('image/')).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddAttachment(file);
      setFeedback('File added');
      setTimeout(() => setFeedback(null), 3000);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <motion.div 
      key={node.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-surface-card border-l border-border-color overflow-hidden"
    >
      {/* [1] The Topic Control Center (Header & Actions) */}
      <div className="sticky top-0 z-10 bg-surface-card/80 backdrop-blur-md border-b border-border-color p-large space-y-medium">
        <div className="flex items-center gap-small">
          <div className={cn(
            "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
            node.status === 'done' ? "bg-success shadow-success/40" : 
            node.status === 'in-progress' ? "bg-warning shadow-warning/40" : 
            "bg-tertiary shadow-tertiary/40"
          )} />
          <h2 className="text-[16px] font-bold text-primary truncate flex-1">{node.title}</h2>
          <button className="p-nano text-tertiary hover:text-primary transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="flex items-center gap-small">
          <button 
            onClick={onStartFocus}
            className="flex-1 py-small bg-accent text-white rounded-lg font-bold flex items-center justify-center gap-small hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent/10"
          >
            <Play size={14} fill="currentColor" />
            <span className="text-[12px] uppercase tracking-wider">Focus</span>
          </button>
          <button 
            onClick={() => {
              const input = document.getElementById('note-input');
              input?.focus();
            }}
            className="flex-1 py-small bg-action-light dark:bg-action-dark text-primary rounded-lg font-bold flex items-center justify-center gap-small hover:bg-border-color transition-all active:scale-95 border border-border-color"
          >
            <Plus size={14} />
            <span className="text-[12px] uppercase tracking-wider">Note</span>
          </button>
          <button 
            onClick={onRecall}
            className="flex-1 py-small bg-action-light dark:bg-action-dark text-primary rounded-lg font-bold flex items-center justify-center gap-small hover:bg-border-color transition-all active:scale-95 border border-border-color"
          >
            <Brain size={14} />
            <span className="text-[12px] uppercase tracking-wider">Recall</span>
          </button>
        </div>
      </div>

      {/* [2] The Concept Stream (Note Architecture) */}
      <div className="flex-1 overflow-y-auto p-large space-y-large custom-scrollbar">
        <div className="space-y-medium">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-tertiary uppercase tracking-[0.2em]">Concept Stream</h4>
            <span className="text-[11px] font-medium text-tertiary opacity-60">{node.notes.length} Atomic Units</span>
          </div>

          <div className="space-y-small">
            {node.notes.length === 0 ? (
              <div className="py-xlarge text-center space-y-small opacity-40">
                <Brain size={32} className="mx-auto text-tertiary" />
                <p className="text-[13px] italic text-tertiary">No concepts captured yet.</p>
              </div>
            ) : (
              node.notes.map(note => (
                <div 
                  key={note.id} 
                  className="group cursor-pointer"
                  onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                >
                  <div className="flex items-start gap-medium py-nano">
                    <div className="mt-2 w-1 h-1 rounded-full bg-accent shrink-0" />
                    <span className={cn(
                      "flex-1 text-[14px] leading-relaxed transition-colors",
                      expandedNoteId === note.id ? "text-primary font-medium" : "text-secondary group-hover:text-primary"
                    )}>
                      {note.text}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 p-nano text-tertiary hover:text-error transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {expandedNoteId === note.id && note.details && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-medium"
                      >
                        <div className="pt-nano pb-small text-[13px] text-tertiary leading-relaxed border-l-2 border-accent/10 pl-medium">
                          {note.details}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Note Input */}
        <div className="pt-medium border-t border-border-color/50">
          <div className="relative">
            <input
              id="note-input"
              className="w-full bg-action-light dark:bg-action-dark rounded-xl pl-medium pr-12 py-medium text-[14px] outline-none focus:ring-2 ring-accent/20 text-primary border border-border-color placeholder:text-tertiary/50"
              placeholder="Capture a one-line concept..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && noteInput.trim()) {
                  onAddNote(noteInput);
                  setNoteInput('');
                }
              }}
            />
            <button 
              onClick={() => {
                if (noteInput.trim()) {
                  onAddNote(noteInput);
                  setNoteInput('');
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-small text-accent hover:opacity-80 transition-opacity"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* [3] The "Vault" (Asset Management) */}
      <div className="bg-action-light/50 dark:bg-action-dark/50 border-t border-border-color">
        <button 
          onClick={() => setIsVaultExpanded(!isVaultExpanded)}
          className="w-full px-large py-medium flex items-center justify-between hover:bg-border-color/20 transition-colors"
        >
          <div className="flex items-center gap-medium text-tertiary">
            <div className="flex items-center gap-nano">
              <FileText size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{pdfCount} PDFs</span>
            </div>
            <div className="w-[1px] h-3 bg-border-color" />
            <div className="flex items-center gap-nano">
              <ImageIcon size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{imgCount} Images</span>
            </div>
          </div>
          <div className="flex items-center gap-small text-tertiary">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Reference Vault</span>
            {isVaultExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        <AnimatePresence>
          {isVaultExpanded && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-large pt-0 space-y-medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-small">
                    <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Attachments</span>
                    <AnimatePresence>
                      {feedback && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[10px] font-bold text-success uppercase tracking-widest"
                        >
                          • {feedback}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <label className="flex items-center gap-nano text-[10px] font-bold text-accent hover:opacity-80 transition-opacity cursor-pointer">
                    <Plus size={12} />
                    Add File
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-nano">
                  {attachments.map((file) => (
                    <motion.div 
                      key={file.id} 
                      layoutId={`media-${file.id}`}
                      className="group flex items-center gap-small p-small bg-border-color/20 rounded-lg border border-border-color/50 hover:bg-border-color/40 transition-colors cursor-pointer"
                      onClick={() => setViewingFile(file)}
                    >
                      <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center text-tertiary">
                        {file.type === 'application/pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-primary truncate">{file.name}</p>
                        <p className="text-[10px] text-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteAttachment(file.id); }}
                        className="opacity-0 group-hover:opacity-100 p-nano text-tertiary hover:text-error transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {attachments.length === 0 && (
                    <div className="py-large text-center text-[12px] text-tertiary italic opacity-60 border border-dashed border-border-color rounded-lg">
                      No assets attached to this topic.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewingFile && (
        <MediaOverlay 
          file={viewingFile} 
          layoutId={`media-${viewingFile.id}`}
          onClose={() => setViewingFile(null)} 
        />
      )}
    </motion.div>
  );
}
