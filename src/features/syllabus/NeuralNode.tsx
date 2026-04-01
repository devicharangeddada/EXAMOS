import { useMemo, type FC } from 'react';
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
    setEditingNodeId,
  } = useSyllabusContext();

  const children = useMemo(() => {
    return (Object.values(nodes) as StudyNode[])
      .filter((n) => n.parentId === node.id)
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
      return (Object.values(nodes) as StudyNode[]).filter((c) => c.parentId === id).some((c) => check(c.id));
    };
    return searchQuery !== '' && check(node.id);
  }, [nodes, node.id, searchQuery]);

  const isDimmed = searchQuery !== '' && !matchesSearch && !hasMatchingChild;
  const isInactive = level === 0 && activeSubjectId !== null && activeSubjectId !== node.id && searchQuery === '';

  const statusColor = node.status === 'done' ? '#34C759' : node.status === 'in-progress' ? '#FF9F0A' : 'var(--text-tertiary)';
  const connectorStartX = Math.max(18, 24 - level * 4);
  const connectorPath = `M${connectorStartX} 4 C${connectorStartX} 4, 10 4, 10 18`;

  return (
    <motion.div
      layout
      className={cn(
        'relative transition-opacity duration-500',
        isDimmed ? 'opacity-20' : isInactive ? 'opacity-40' : 'opacity-100'
      )}
    >
      {level > 0 && (
        <motion.svg layout className="absolute left-[-20px] top-[12px] w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
          <path d={connectorPath} fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 18 L10 28" fill="none" stroke="rgba(74,144,226,0.22)" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      )}

      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'group relative flex flex-col rounded-xl cursor-pointer border transition-all duration-500',
          level === 0 ? 'p-small mb-[2px]' : 'p-[10px] mb-[2px]',
          isElite && 'elite-node',
          !isElite && 'border-transparent',
          isSelected && 'border-accent/60 bg-accent/10 shadow-[0_0_28px_rgba(108,140,255,0.14)]',
          isExpanded ? 'bg-black/[0.03] dark:bg-white/[0.03]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
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
            <div className="flex items-center justify-between gap-small">
              {node.id === undefined ? null : (
                <span className={cn('truncate tracking-tighter font-medium', level === 0 ? 'text-[16px] text-primary' : 'text-[14px] text-secondary')}>
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
                  className={cn('p-small transition-colors', node.isPriority ? 'text-accent' : 'text-tertiary/30 hover:text-accent')}
                  aria-label={node.isPriority ? 'Remove priority' : 'Mark as priority'}
                >
                  <Star size={12} fill={node.isPriority ? 'currentColor' : 'none'} />
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
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => onStartFocus(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano bg-accent text-white rounded-lg text-[11px] font-medium hover:opacity-90"
                >
                  <Play size={11} fill="currentColor" /> Focus
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => onRecall(node.id)}
                  className="flex-1 flex items-center justify-center gap-nano py-nano rounded-lg text-[11px] font-medium border border-border-color bg-action-light dark:bg-action-dark text-primary"
                >
                  <Zap size={11} /> Recall
                </motion.button>
                <div className="flex items-center gap-nano bg-action-light dark:bg-action-dark p-small rounded-lg border border-border-color">
                  {(['not-started', 'in-progress', 'done'] as NodeStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateNodeStatus(node.id, status)}
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-md transition-all',
                        node.status === status ? 'bg-white dark:bg-black shadow-sm text-accent' : 'text-tertiary hover:text-primary'
                      )}
                      aria-label={`Mark ${node.title} as ${status}`}
                      type="button"
                    >
                      {status === 'done' ? <CheckCircle2 size={11} /> : status === 'in-progress' ? <Clock size={11} /> : <Target size={11} />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-nano">
                  <button onClick={() => addNode(node.id)} className="p-small text-tertiary hover:text-primary" aria-label="Add child topic" type="button"><Plus size={13} /></button>
                  <button onClick={() => setEditingNodeId(node.id)} className="p-small text-tertiary hover:text-primary" aria-label="Edit node title" type="button"><Edit3 size={13} /></button>
                  <button onClick={() => deleteNode(node.id)} className="p-small text-tertiary hover:text-error" aria-label="Delete node" type="button"><Trash2 size={13} /></button>
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
}
