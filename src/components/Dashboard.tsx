import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { differenceInDays, parseISO, formatDistanceToNow } from 'date-fns';
import { AppState, StudyNode } from '../types';
import { Book, ChevronRight, Clock, Sparkles, ArrowRight, Zap, AlertCircle, CheckCircle2, Play } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  state: AppState;
  onSelectSubject: (id: string) => void;
  onAction: (type: 'focus' | 'flashcards' | 'syllabus', nodeId?: string) => void;
}

export default function Dashboard({ state, onSelectSubject, onAction }: DashboardProps) {
  const daysLeft = useMemo(() => {
    const diff = differenceInDays(parseISO(state.onboarding.examDate), new Date());
    return Math.max(0, diff);
  }, [state.onboarding.examDate]);

  const subjects = useMemo(() => {
    return Object.values(state.nodes).filter(node => node.parentId === null);
  }, [state.nodes]);

  // Real Talk Metric: completed_topics vs required_velocity
  const progressStats = useMemo(() => {
    const allNodes = Object.values(state.nodes);
    const completed = allNodes.filter(n => n.status === 'done').length;
    const total = allNodes.length || 1;
    const progress = (completed / total) * 100;
    
    // Simple velocity check: (total / daysLeft) vs (completed / daysElapsed)
    // For now, let's just use a target based on days remaining
    const daysSinceStart = 1; // Placeholder
    const requiredVelocity = total / (daysLeft + daysSinceStart);
    const currentVelocity = completed / daysSinceStart;
    
    const isAhead = currentVelocity >= requiredVelocity;
    const remainingTopics = total - completed;
    const topicsPerDay = daysLeft > 0 ? Math.ceil(remainingTopics / daysLeft) : remainingTopics;

    return {
      progress: Math.round(progress),
      isAhead,
      topicsPerDay,
      completed,
      total
    };
  }, [state.nodes, daysLeft]);

  // Weakness Detection Algorithm
  // Score = (FailCount * 2) + (FocusDifficulty * 1.5) - (DaysSinceLastReview)
  const weakTopics = useMemo(() => {
    return Object.values(state.nodes)
      .filter(n => n.parentId !== null) // Only sub-topics
      .map(node => {
        const daysSinceLastReview = node.lastInteraction 
          ? differenceInDays(new Date(), parseISO(node.lastInteraction)) 
          : 30; // Default to 30 if never reviewed
        
        const score = (node.failCount * 2) + (node.focusDifficulty * 1.5) - daysSinceLastReview;
        return { ...node, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [state.nodes]);

  const primaryAction = useMemo(() => {
    if (state.interruptedSession) {
      const node = state.nodes[state.interruptedSession.nodeId];
      return {
        type: 'focus' as const,
        nodeId: node.id,
        label: `Resume: ${node.title}`,
        reason: 'Pick up where you left off.',
        icon: Clock
      };
    }

    if (weakTopics.length > 0 && weakTopics[0].score > 5) {
      return {
        type: 'flashcards' as const,
        nodeId: weakTopics[0].id,
        label: `Revise: ${weakTopics[0].title}`,
        reason: 'This topic is slipping. Strengthen it now.',
        icon: Zap
      };
    }

    const nextTopic = Object.values(state.nodes).find(n => n.status === 'not-started' && n.parentId !== null);
    if (nextTopic) {
      return {
        type: 'focus' as const,
        nodeId: nextTopic.id,
        label: `Start: ${nextTopic.title}`,
        reason: 'Next topic in your syllabus.',
        icon: Play
      };
    }

    return null;
  }, [state.interruptedSession, state.nodes, weakTopics]);

  return (
    <div className="space-y-large py-medium">
      {/* Real Talk Metric */}
      <section className="space-y-small">
        <div className="flex items-end justify-between">
          <div className="space-y-nano">
            <h2 className="text-[44px] font-medium tracking-tighter leading-none text-primary tabular-nums">
              {daysLeft} <span className="text-[16px] font-normal text-tertiary tracking-normal">days left</span>
            </h2>
            <p className="text-xs font-medium text-secondary uppercase tracking-wider">
              Target: {state.onboarding.examName}
            </p>
          </div>
          <div className="text-right space-y-nano">
            <p className={cn(
              "text-xs font-bold uppercase tracking-widest",
              progressStats.isAhead ? "text-success" : "text-accent"
            )}>
              {progressStats.isAhead ? "Ahead of Schedule" : "Behind Schedule"}
            </p>
            <p className="text-[11px] text-tertiary">
              {progressStats.isAhead 
                ? "You've earned a longer break." 
                : `Target: ${progressStats.topicsPerDay} more topics today.`}
            </p>
          </div>
        </div>
        
        <div className="w-full h-1.5 bg-action-light dark:bg-action-dark rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressStats.progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </section>

      {/* Single Action Dashboard (Hero Button) */}
      <AnimatePresence mode="wait">
        {primaryAction && (
          <motion.section 
            key={primaryAction.nodeId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden elevated-card border-accent/20 bg-accent/[0.03] p-large"
          >
            <div className="absolute top-0 right-0 p-small opacity-5">
              <primaryAction.icon size={140} />
            </div>
            
            <div className="space-y-medium relative z-10">
              <div className="space-y-nano">
                <div className="flex items-center gap-nano text-accent caption-sm font-bold uppercase tracking-widest">
                  <Sparkles size={14} />
                  Priority Action
                </div>
                <h3 className="text-[24px] font-medium tracking-tight text-primary">{primaryAction.label}</h3>
                <p className="text-secondary text-sm">{primaryAction.reason}</p>
              </div>

              <button 
                onClick={() => onAction(primaryAction.type, primaryAction.nodeId)}
                className="w-full h-14 bg-accent text-white rounded-2xl font-medium flex items-center justify-center gap-small shadow-lg shadow-accent/20 transition-all press-scale"
              >
                Execute Now
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Quick Recall / Weak Areas */}
      <section className="space-y-medium">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-small">
            <h3 className="text-[11px] uppercase tracking-widest font-bold text-tertiary">Quick Recall</h3>
            {weakTopics.length > 0 && (
              <button 
                onClick={() => onAction('flashcards')}
                className="px-small py-nano bg-error/10 text-error rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-error/20 transition-colors"
              >
                Revise Weak Only
              </button>
            )}
          </div>
          <span className="text-[10px] text-tertiary">Based on Weakness Algorithm</span>
        </div>

        {weakTopics.length === 0 ? (
          <div className="surface-card p-large text-center space-y-small border border-dashed border-border-color">
            <CheckCircle2 className="mx-auto text-success opacity-40" size={32} />
            <p className="text-sm font-medium text-secondary">Memory is Sharp.</p>
            <p className="text-xs text-tertiary">Time for a Deep Focus Session?</p>
          </div>
        ) : (
          <div className="space-y-small">
            {weakTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onAction('flashcards', topic.id)}
                className="w-full surface-card p-medium flex items-center justify-between group press-scale border border-border-color/50"
              >
                <div className="flex items-center gap-medium">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    topic.score > 10 ? "bg-error/10 text-error" : "bg-accent/10 text-accent"
                  )}>
                    <Zap size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-primary">{topic.title}</h4>
                    <p className="text-[10px] text-tertiary uppercase tracking-wider">
                      {topic.score > 10 ? 'Critical Weakness' : 'Needs Review'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-tertiary opacity-40 group-hover:opacity-100 transition-opacity" size={18} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Subjects Grid (Secondary Surface) */}
      <section className="space-y-medium">
        <h3 className="text-[11px] uppercase tracking-widest font-bold text-tertiary">Syllabus Overview</h3>
        <div className="grid grid-cols-2 gap-small">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => onSelectSubject(subject.id)}
              className="surface-card p-medium text-left space-y-nano border border-border-color/30 hover:border-accent/30 transition-colors"
            >
              <h4 className="text-xs font-medium text-secondary truncate">{subject.title}</h4>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-tertiary uppercase">{subject.status.replace('-', ' ')}</span>
                <div className="w-8 h-1 bg-action-light dark:bg-action-dark rounded-full overflow-hidden">
                  <div className="h-full bg-accent/40 w-1/3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}


