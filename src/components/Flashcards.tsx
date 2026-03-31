import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { StudyNode, Note } from '../types';
import { 
  Zap, RotateCcw, Check, X, Split, AlertCircle, CheckCircle2, 
  Brain, Flame, ArrowRight, ArrowLeft, Info, ChevronUp,
  Settings2, EyeOff, Eye, Gauge, Trophy, Target, TrendingUp,
  Filter, ZapOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import LiquidButton from './LiquidButton';
import { calculateUrgencyScore, shouldSplitNote } from '../lib/brain';

interface FlashcardsProps {
  nodes: Record<string, StudyNode>;
  onFinish: () => void;
  updateNodes: (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => void;
  initialMode?: 'normal' | 'weak-only';
}

interface CardData {
  nodeId: string;
  nodeTitle: string;
  note: Note;
  priority: number;
  type: 'qa' | 'cloze' | 'keyword';
  question: string;
  answer: string;
}

export default function Flashcards({ nodes, onFinish, updateNodes, initialMode = 'normal' }: FlashcardsProps) {
  const [speedMode, setSpeedMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState<'normal' | 'weak-only'>(initialMode);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ 
    easy: 0, 
    hard: 0, 
    unknown: 0, 
    streak: 0,
    bestStreak: 0,
    startTime: Date.now()
  });

  // Card Type Parser
  const parseCard = (note: Note): { type: CardData['type'], question: string, answer: string } => {
    const text = note.text;
    
    // Cloze: "F = __"
    if (text.includes('__')) {
      return { type: 'cloze', question: text, answer: note.details || 'Fill in the blank' };
    }
    
    // Q&A: "Question :: Answer" or "Question?"
    if (text.includes('::')) {
      const [q, a] = text.split('::');
      return { type: 'qa', question: q.trim(), answer: a.trim() };
    }
    
    if (text.endsWith('?')) {
      return { type: 'qa', question: text, answer: note.details || 'Recall the answer' };
    }

    // Keyword: Default
    return { type: 'keyword', question: text, answer: note.details || 'Define or explain this concept' };
  };

  // Priority Engine: Sort and filter cards
  const sessionCards = useMemo(() => {
    const allCards: CardData[] = [];
    const now = new Date();

    Object.values(nodes).forEach(node => {
      node.notes.forEach(note => {
        // Leitner-based priority: lower boxes and due cards first
        const box = typeof note.leitnerBox === 'number' ? note.leitnerBox : 0;
        const nextDue = note.nextDue ? new Date(note.nextDue) : new Date(0);
        const isDue = nextDue <= now;

        // Base priority: due cards in lower boxes are strongest magnets
        let priority = 0;
        if (isDue) {
          priority = (4 - box) * 100 + (note.failCount || 0) * 5;
        } else {
          priority = (4 - box) * 10;
        }

        if (mode === 'weak-only') {
          // In weak-only mode, only surface cards in boxes 0–2 or overdue cards
          if (box > 2 && !isDue) return;
        }

        const { type, question, answer } = parseCard(note);

        allCards.push({ 
          nodeId: node.id,
          nodeTitle: node.title, 
          note,
          priority,
          type,
          question,
          answer
        });
      });
    });

    // Sort by priority and limit session size
    return allCards
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20);
  }, [nodes, mode]);

  const [cards, setCards] = useState<CardData[]>(sessionCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [weakCards, setWeakCards] = useState<CardData[]>([]);

  const currentCard = cards[currentIndex];

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    if (!currentCard) return;

    let confidenceChange = 0;
    let nextIntervalDays = 0;
    let leitnerDelta = 0;
    let isCorrect = false;

    if (direction === 'right') { // Easy → promote in Leitner
      confidenceChange = 1;
      isCorrect = true;
      leitnerDelta = 1;
      // Leitner-style intervals by box
      const intervalsByBox = [1, 3, 7, 15, 30]; // days
      const currentBox = typeof currentCard.note.leitnerBox === 'number' ? currentCard.note.leitnerBox : 0;
      const targetBox = Math.min(currentBox + 1, intervalsByBox.length - 1);
      nextIntervalDays = intervalsByBox[targetBox];
    } else if (direction === 'up') { // Hard → keep box, short revisit
      confidenceChange = 0;
      isCorrect = true;
      leitnerDelta = 0;
      nextIntervalDays = 1; // recheck soon
    } else { // Don't Know → demote / stay in lowest box
      confidenceChange = -1;
      isCorrect = false;
      leitnerDelta = -1;
      nextIntervalDays = 0; // Same session
    }

    // Update Stats
    setStats(s => {
      const newStreak = isCorrect ? s.streak + 1 : 0;
      return {
        ...s,
        easy: direction === 'right' ? s.easy + 1 : s.easy,
        hard: direction === 'up' ? s.hard + 1 : s.hard,
        unknown: direction === 'left' ? s.unknown + 1 : s.unknown,
        streak: newStreak,
        bestStreak: Math.max(s.bestStreak, newStreak)
      };
    });

    if (!isCorrect) {
      setWeakCards(prev => [...prev, currentCard]);
    }

    // Update Note Metadata
    updateNodes(prev => {
      const node = prev[currentCard.nodeId];
      if (!node) return prev;
      
      const updatedNotes = node.notes.map(n => {
        if (n.id === currentCard.note.id) {
          const currentBox = typeof n.leitnerBox === 'number' ? n.leitnerBox : 0;
          const nextBox = Math.max(0, Math.min(4, currentBox + leitnerDelta));
          const newConfidence = Math.max(0, Math.min(3, n.confidence + confidenceChange));
          const newLevel = isCorrect ? Math.min(3, n.level + (direction === 'right' ? 1 : 0)) : 0;
          const nextDue = new Date();
          nextDue.setDate(nextDue.getDate() + nextIntervalDays);

          return {
            ...n,
            confidence: newConfidence,
            level: newLevel,
            streak: isCorrect ? n.streak + 1 : 0,
            failCount: isCorrect ? n.failCount : (n.failCount || 0) + 1,
            lastSeen: new Date().toISOString(),
              nextDue: nextDue.toISOString(),
              urgencyScore: (3 - newConfidence) * 10,
              leitnerBox: nextBox,
              lastLeitnerMoveAt: new Date().toISOString()
          };
        }
        return n;
      });

      return {
        ...prev,
        [currentCard.nodeId]: {
          ...node,
          notes: updatedNotes,
          lastInteraction: new Date().toISOString()
        }
      };
    });

    // Weak Card Loop: If "Don't Know", re-insert into current session
    if (!isCorrect) {
      const newCards = [...cards];
      const targetIndex = Math.min(currentIndex + 4, newCards.length);
      newCards.splice(targetIndex, 0, currentCard);
      setCards(newCards);
    }

    if (currentIndex >= cards.length - 1) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const retentionScore = useMemo(() => {
    const total = stats.easy + stats.hard + stats.unknown;
    if (total === 0) return 0;
    return Math.round(((stats.easy + stats.hard * 0.5) / total) * 100);
  }, [stats]);

  if (cards.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center space-y-large text-center p-large">
        <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center text-accent/20">
          <Brain size={40} />
        </div>
        <div className="space-y-small">
          <h2 className="text-[20px] font-bold text-primary">No Cards Due</h2>
          <p className="text-[14px] text-secondary max-w-xs leading-relaxed">
            {mode === 'weak-only' ? "You have no weak cards to revise!" : "Your memory is currently reinforced. Add more notes to continue."}
          </p>
        </div>
        <div className="flex flex-col gap-medium">
          <button onClick={onFinish} className="px-large py-medium bg-accent text-white rounded-xl font-bold hover:opacity-90 transition-all">
            Go Back
          </button>
          {mode === 'weak-only' && (
            <button onClick={() => setMode('normal')} className="text-[12px] font-bold text-tertiary hover:text-primary transition-colors">
              Switch to Normal Mode
            </button>
          )}
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center space-y-xlarge p-large">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-xlarge"
        >
          <div className="text-center space-y-small">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto text-success mb-medium">
              <Trophy size={40} />
            </div>
            <h2 className="text-[28px] font-bold text-primary tracking-tight">Session Complete</h2>
            <p className="text-secondary">You've reinforced {cards.length} concepts.</p>
          </div>

          <div className="grid grid-cols-2 gap-medium">
            <div className="surface-card p-large rounded-2xl border border-border-color flex flex-col items-center gap-small">
              <Target className="text-accent" size={20} />
              <p className="text-[24px] font-bold text-primary">{retentionScore}%</p>
              <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Retention Score</p>
            </div>
            <div className="surface-card p-large rounded-2xl border border-border-color flex flex-col items-center gap-small">
              <Flame className="text-orange-500" size={20} />
              <p className="text-[24px] font-bold text-primary">{stats.bestStreak}</p>
              <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Best Streak</p>
            </div>
          </div>

          {weakCards.length > 0 && (
            <div className="space-y-medium">
              <p className="text-[11px] font-bold text-tertiary uppercase tracking-widest px-small">Weak Concepts to Review</p>
              <div className="space-y-small">
                {Array.from(new Set(weakCards.map(c => c.note.id))).slice(0, 3).map(id => {
                  const card = weakCards.find(c => c.note.id === id);
                  return (
                    <div key={id} className="surface-card p-medium rounded-xl border border-border-color flex items-center gap-medium">
                      <div className="w-2 h-2 rounded-full bg-error" />
                      <p className="text-[13px] text-secondary truncate flex-1">{card?.note.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-medium pt-medium">
            <LiquidButton 
              onClick={onFinish} 
              className="w-full"
            >
              Return to Base
            </LiquidButton>
            <button 
              onClick={() => {
                setSessionComplete(false);
                setCurrentIndex(0);
                setStats({ easy: 0, hard: 0, unknown: 0, streak: 0, bestStreak: 0, startTime: Date.now() });
                setWeakCards([]);
              }} 
              className="w-full h-14 bg-action-light dark:bg-action-dark text-primary rounded-2xl font-bold border border-border-color hover:bg-border-color/20 transition-all"
            >
              Start New Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-full flex flex-col items-center justify-between py-xlarge px-large transition-colors duration-500",
      focusMode ? "bg-black" : "bg-transparent"
    )}>
      {/* Header */}
      {!focusMode && (
        <div className="w-full max-w-[340px] flex items-center justify-between">
          <div className="flex items-center gap-medium">
            <div className="px-small py-nano bg-accent/10 rounded-full flex items-center gap-nano">
              <Flame size={12} className="text-accent" fill="currentColor" />
              <span className="text-[12px] font-bold text-accent">{stats.streak}</span>
            </div>
            <div className="flex items-center gap-nano text-tertiary">
              <TrendingUp size={12} />
              <span className="text-[12px] font-bold">{retentionScore}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-small">
            <button 
              onClick={() => setMode(mode === 'normal' ? 'weak-only' : 'normal')}
              className={cn("p-small rounded-lg transition-colors", mode === 'weak-only' ? "text-error bg-error/10" : "text-tertiary hover:bg-border-color/20")}
              title={mode === 'weak-only' ? "Weak Only Mode" : "Normal Mode"}
            >
              <Filter size={18} />
            </button>
            <button 
              onClick={() => setSpeedMode(!speedMode)}
              className={cn("p-small rounded-lg transition-colors", speedMode ? "text-accent bg-accent/10" : "text-tertiary hover:bg-border-color/20")}
              title="Speed Mode"
            >
              <Gauge size={18} />
            </button>
            <button 
              onClick={() => setFocusMode(!focusMode)}
              className="p-small rounded-lg text-tertiary hover:bg-border-color/20 transition-colors"
              title="Focus Mode"
            >
              <EyeOff size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!focusMode && (
        <div className="w-full max-w-[340px] h-1 bg-border-color/30 rounded-full overflow-hidden mt-medium">
          <motion.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      )}

      {/* Card Stack */}
      <div className="relative w-[340px] h-[440px] mt-xlarge">
        <AnimatePresence mode="popLayout">
          <FlashcardItem 
            key={currentIndex}
            card={currentCard}
            showAnswer={showAnswer}
            onToggle={() => setShowAnswer(!showAnswer)}
            onSwipe={handleSwipe}
            speedMode={speedMode}
          />
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!focusMode && (
        <div className="w-full max-w-[340px] space-y-large mt-xlarge">
          <div className="flex justify-between gap-medium">
            <button 
              onClick={() => handleSwipe('left')}
              className="flex-1 flex flex-col items-center gap-nano p-medium bg-action-light dark:bg-action-dark rounded-2xl border border-border-color text-error hover:bg-error/5 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Don't Know</span>
            </button>
            <button 
              onClick={() => handleSwipe('up')}
              className="flex-1 flex flex-col items-center gap-nano p-medium bg-action-light dark:bg-action-dark rounded-2xl border border-border-color text-accent hover:bg-accent/5 transition-all active:scale-95"
            >
              <ChevronUp size={20} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Hard</span>
            </button>
            <button 
              onClick={() => handleSwipe('right')}
              className="flex-1 flex flex-col items-center gap-nano p-medium bg-accent rounded-2xl text-white shadow-lg shadow-accent/20 hover:opacity-90 transition-all active:scale-95"
            >
              <ArrowRight size={20} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Easy</span>
            </button>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-large py-small rounded-full bg-border-color/10 text-[11px] font-bold text-tertiary uppercase tracking-[0.2em] hover:bg-border-color/20 transition-all"
            >
              {showAnswer ? 'Hide Details' : 'Reveal Details'}
            </button>
          </div>
        </div>
      )}

      {focusMode && (
        <button 
          onClick={() => setFocusMode(false)}
          className="fixed bottom-large right-large p-medium bg-white/10 backdrop-blur-md rounded-full text-white/40 hover:text-white transition-all"
        >
          <Eye size={20} />
        </button>
      )}
    </div>
  );
}

const FlashcardItem: React.FC<{ 
  card: CardData, 
  showAnswer: boolean, 
  onToggle: () => void, 
  onSwipe: (dir: 'left' | 'right' | 'up') => void,
  speedMode: boolean
}> = ({ card, showAnswer, onToggle, onSwipe, speedMode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const backgroundColor = useTransform(
    x,
    [-150, 0, 150],
    ["rgba(239, 68, 68, 0.1)", "rgba(255, 255, 255, 1)", "rgba(34, 197, 94, 0.1)"]
  );

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
    else if (info.offset.y < -100) onSwipe('up');
  };

  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      initial={speedMode ? { opacity: 1 } : { x: 300, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={speedMode ? { opacity: 0 } : { x: -300, opacity: 0 }}
      transition={speedMode ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <motion.div 
        onClick={onToggle}
        style={{ backgroundColor }}
        className="w-full h-full bg-surface-card rounded-[24px] p-xlarge flex flex-col items-center justify-center text-center select-none relative overflow-hidden border border-border-color shadow-2xl"
      >
        {/* Card Header */}
        <div className="absolute top-large left-large right-large flex items-center justify-between">
          <div className="flex items-center gap-small">
            <div className={cn(
              "w-2 h-2 rounded-full",
              card.note.level === 3 ? "bg-success" : card.note.level === 2 ? "bg-accent" : "bg-error"
            )} />
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">{card.nodeTitle}</span>
            {shouldSplitNote(card.note) && (
              <div className="flex items-center gap-nano text-error animate-pulse">
                <Split size={10} />
                <span className="text-[8px] font-bold uppercase">Complex</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-nano">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-3 h-1 rounded-full transition-colors",
                  i < card.note.level ? "bg-accent" : "bg-border-color/30"
                )} 
              />
            ))}
          </div>
        </div>

        {/* Card Content */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-xlarge w-full">
          <div className="space-y-medium w-full">
            <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] opacity-30">
              {card.type === 'cloze' ? 'Fill in the blank' : card.type === 'qa' ? 'Question' : 'Concept'}
            </p>
            <h3 className="text-[22px] font-bold tracking-tight leading-tight text-primary px-medium">
              {card.question}
            </h3>
          </div>

          <AnimatePresence>
            {showAnswer && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-medium pt-xlarge border-t border-border-color/50 w-full"
              >
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] opacity-30">
                  {card.type === 'cloze' ? 'Missing Part' : 'Answer'}
                </p>
                <p className="text-[15px] font-medium text-secondary leading-relaxed px-small">
                  {card.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Hint */}
        <div className="absolute bottom-large left-0 right-0 flex justify-center">
          <div className="flex items-center gap-small opacity-20">
            <div className="flex flex-col items-center gap-nano">
              <ArrowLeft size={10} />
              <span className="text-[8px] font-bold uppercase">Skip</span>
            </div>
            <div className="w-[1px] h-4 bg-tertiary" />
            <div className="flex flex-col items-center gap-nano">
              <ChevronUp size={10} />
              <span className="text-[8px] font-bold uppercase">Hard</span>
            </div>
            <div className="w-[1px] h-4 bg-tertiary" />
            <div className="flex flex-col items-center gap-nano">
              <ArrowRight size={10} />
              <span className="text-[8px] font-bold uppercase">Easy</span>
            </div>
          </div>
        </div>

        {/* Swipe Indicators */}
        <motion.div 
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
          className="absolute top-1/2 right-large -translate-y-1/2 text-success font-black text-[14px] uppercase tracking-widest border-2 border-success px-small py-nano rounded-lg rotate-90"
        >
          Easy
        </motion.div>
        <motion.div 
          style={{ opacity: useTransform(x, [0, -100], [0, 1]) }}
          className="absolute top-1/2 left-large -translate-y-1/2 text-error font-black text-[14px] uppercase tracking-widest border-2 border-error px-small py-nano rounded-lg -rotate-90"
        >
          Don't Know
        </motion.div>
        <motion.div 
          style={{ opacity: useTransform(y, [0, -100], [0, 1]) }}
          className="absolute bottom-xlarge left-1/2 -translate-x-1/2 text-accent font-black text-[14px] uppercase tracking-widest border-2 border-accent px-small py-nano rounded-lg"
        >
          Hard
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
