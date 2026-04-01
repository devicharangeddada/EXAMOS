import { useMemo, useState, useEffect, type FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Plus, Edit3, Trash2, CheckCircle2, Clock, Target, Zap, Play, X } from 'lucide-react';
import { StudyNode, NodeStatus } from '../../types';
import { cn } from '../../lib/utils';
import { useSyllabusContext } from './SyllabusContext';
import VelocitySparkline from './VelocitySparkline';

interface NeuralNodeProps {
  node: StudyNode;
  level?: number;
  isLast?: boolean;
}

const NeuralNode: FC<NeuralNodeProps> = ({ node, level = 0 }) => {
  const {
    nodes,
    nodeCompletions,
    expandedIds,
    searchQuery,
    activeSubjectId,
    selectedNodeId,
    updateNodes,
    toggleExpand,
    togglePriority,
    updateNodeStatus,
    deleteNode,
    addNode,
    onSelect,
    onStartFocus,
    onRecall,
    editingNodeId,
    setEditingNodeId,
  } = useSyllabusContext();

  const children = useMemo(() => {
    return (Object.values(nodes) as StudyNode[])
      .filter((n) => n.parentId === node.id)
      .sort((a, b) => a.order - b.order);
  }, [nodes, node.id]);

  const [editTitle, setEditTitle] = useState(node.title);

  useEffect(() => {
    if (editingNodeId === node.id) {
      setEditTitle(node.title);
    }
  }, [editingNodeId, node.id, node.title]);

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
      return (Object.values(nodes) as StudyNode[]).filter((c) => c.parentId === id).some((c) => check(c.id));
    };
    return searchQuery !== '' && check(node.id);
  }, [nodes, node.id, searchQuery]);

  const isSearchDimmed = searchQuery !== '' && !matchesSearch && !hasMatchingChild;

  const statusColor = node.status === 'done' ? '#34C759' : node.status === 'in-progress' ? '#FF9F0A' : 'var(--text-tertiary)';
  const connectorStartX = Math.max(18, 24 - level * 4);
  const connectorPath = `M${connectorStartX} 4 C${connectorStartX} 4, 10 4, 10 18`;

  return (
    <motion.div
      layout
      className={cn(
        'relative transition-opacity duration-500',
        isSearchDimmed ? 'opacity-70' : 'opacity-100'
      )}
    >
      {level > 0 && (
        <motion.svg layout className="absolute left-[-20px] top-[12px] w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
          <path d={connectorPath} fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 18 L10 28" fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      )}

      <motion.div
        layout="position"
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ marginLeft: level > 0 ? 'clamp(12px, 4vw, 22px)' : '0' }}
        className={cn(
          'group relative flex flex-col rounded-[18px] cursor-pointer border transition-all duration-500 min-h-[52px] overflow-hidden',
          level === 0 ? 'p-[18px] mb-3' : 'p-[14px] mb-2',
          'bg-white/95 dark:bg-white/5',
          isExpanded ? 'bg-black/[0.04] dark:bg-white/[0.05]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.06]',
          isSelected && 'border-accent/70 bg-accent/12 shadow-[0_0_30px_rgba(94,92,230,0.18)] ring-1 ring-accent/15',
          !isSelected && 'border-transparent',
          isSearchDimmed && 'opacity-70'
        )}
        onClick={() => {
          toggleExpand(node.id);
          onSelect(node.id);
        }}
      >
        <div className="flex items-center gap-small">
          <div
            className="w-2 h-2 rounded-full shrink-0 transition-all duration-500"
            style={{
              backgroundColor: statusColor,
              boxShadow:
                node.status === 'done'
                  ? '0 0 6px rgba(52,199,89,0.6)'
                  : node.status === 'in-progress'
                  ? '0 0 6px rgba(255,159,10,0.6)'
                  : 'none',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-small">
              {node.id === undefined ? null : editingNodeId === node.id ? (
                <input
                  autoFocus
                  className={cn(
                    'flex-1 bg-background border border-accent/50 outline-none rounded-md px-2 py-1 w-full',
                    level === 0 ? 'text-[16px] text-primary' : 'text-[14px] text-primary'
                  )}
                  value={editTitle}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => {
                    const finalTitle = editTitle.trim() || node.title;
                    if (finalTitle !== node.title) {
                      updateNodes((prev) => ({
                        ...prev,
                        [node.id]: { ...prev[node.id], title: finalTitle },
                      }));
                    }
                    setEditingNodeId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditTitle(node.title);
                      setEditingNodeId(null);
                    }
                  }}
                />
              ) : (
                <span className={cn('truncate tracking-tighter font-medium block w-full', level === 0 ? 'text-[16px] text-primary' : 'text-[14px] text-secondary')}>
                  {node.title}
                  {isElite && <span className="ml-1 text-[10px]" style={{ color: 'rgba(253,196,45,0.9)' }}>★</span>}
                </span>
              )}

              <div className="flex items-center gap-[6px] shrink-0">
                <VelocitySparkline value={completion} />
                <span className={cn('text-[11px] font-medium tabular-nums', isElite ? 'text-yellow-400' : 'text-tertiary')}>{completion}%</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePriority(node.id);
                  }}
                  className={cn(
                    'w-11 h-11 flex items-center justify-center rounded-[12px] transition-colors',
                    node.isPriority ? 'text-accent' : 'text-tertiary/30 hover:text-accent'
                  )}
                  aria-label={node.isPriority ? 'Remove priority' : 'Mark as priority'}
                  type="button"
                >
                  <Star size={14} fill={node.isPriority ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <div className="mt-[5px] w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{
                  background: isElite ? 'linear-gradient(90deg, #F59E0B, #FDE047)' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        </div>

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
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  onClick={() => onStartFocus(node.id)}
                  className="flex-1 flex min-h-[44px] items-center justify-center gap-small rounded-[12px] bg-accent text-white text-[13px] font-medium hover:opacity-90"
                  type="button"
                >
                  <Play size={11} fill="currentColor" /> Focus
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  onClick={() => onRecall(node.id)}
                  className="flex-1 flex min-h-[44px] items-center justify-center gap-small rounded-[12px] text-[13px] font-medium border border-border-color bg-action-light dark:bg-action-dark text-primary"
                  type="button"
                >
                  <Zap size={11} /> Recall
                </motion.button>
                <div className="flex items-center gap-nano bg-action-light dark:bg-action-dark p-small rounded-lg border border-border-color">
                  {(['not-started', 'in-progress', 'done'] as NodeStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateNodeStatus(node.id, status)}
                      className={cn(
                        'w-11 h-11 flex items-center justify-center rounded-[12px] transition-all',
                        node.status === status ? 'bg-white dark:bg-black shadow-sm text-accent' : 'text-tertiary hover:text-primary'
                      )}
                      aria-label={`Mark ${node.title} as ${status}`}
                      type="button"
                    >
                      {status === 'done' ? <CheckCircle2 size={11} /> : status === 'in-progress' ? <Clock size={11} /> : <Target size={11} />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-small">
                  <button onClick={() => addNode(node.id)} className="w-11 h-11 flex items-center justify-center rounded-[12px] text-tertiary hover:text-primary border border-border-color bg-surface-bg transition-colors" aria-label="Add child topic" type="button"><Plus size={16} /></button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNodeId(node.id);
                    }}
                    className="w-11 h-11 flex items-center justify-center rounded-[12px] text-tertiary hover:text-primary border border-border-color bg-surface-bg transition-colors"
                    aria-label="Edit node title"
                    type="button"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteNode(node.id)} className="w-11 h-11 flex items-center justify-center rounded-[12px] text-tertiary hover:text-error border border-border-color bg-surface-bg transition-colors" aria-label="Delete node" type="button"><Trash2 size={16} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
            {children.map((child) => (
              <NeuralNode key={child.id} node={child} level={level + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NeuralNode;
