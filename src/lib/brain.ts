import { differenceInDays, parseISO } from 'date-fns';
import { Note, StudyNode, AppState } from '../types';

/**
 * Logic #2: The Prioritization Algorithm (The "Recall Engine")
 * Elite System: Due > Weak > New > Mastered
 */
export function calculateUrgencyScore(note: Note, nodeWeight: number): number {
  const now = new Date();
  const nextDue = note.nextDue ? parseISO(note.nextDue) : new Date(0);
  const isDue = nextDue <= now;
  
  let score = 0;
  
  // Priority 1: Due cards
  if (isDue) score += 100;
  
  // Priority 2: Weak cards (low confidence, high fail count)
  score += (3 - note.confidence) * 10;
  score += (note.failCount || 0) * 5;
  
  // Priority 3: New cards
  if (note.level === 0) score += 50;
  
  // Factor in node weight
  score *= (nodeWeight / 100 + 1);
  
  return score;
}

/**
 * Logic #10 (Evolution): If a card's "Fail Count" > 3, flag it to be split.
 */
export function shouldSplitNote(note: Note): boolean {
  return (note.failCount || 0) > 3;
}

/**
 * Logic #12 (Minimal Control): Calculate the Primary Action Button (PAB)
 */
export interface PABAction {
  type: 'revision' | 'resume' | 'new';
  nodeId: string;
  label: string;
  reason: string;
}

export function calculatePAB(state: AppState): PABAction | null {
  const nodes = Object.values(state.nodes) as StudyNode[];
  if (nodes.length === 0) return null;

  // Priority 1: Due Revisions
  const revisionNode = nodes.find(n => n.status === 'revise');
  if (revisionNode) {
    return {
      type: 'revision',
      nodeId: revisionNode.id,
      label: `Revise ${revisionNode.title}`,
      reason: 'This topic needs a memory refresh.'
    };
  }

  // Priority 2: Resuming Last Topic
  if (state.activeSlotId && state.nodes[state.activeSlotId]) {
    const activeNode = state.nodes[state.activeSlotId];
    if (activeNode.status === 'in-progress') {
      return {
        type: 'resume',
        nodeId: activeNode.id,
        label: `Resume ${activeNode.title}`,
        reason: 'Continue where you left off.'
      };
    }
  }

  // Priority 3: Starting New Node
  const newNode = nodes.find(n => n.status === 'not-started');
  if (newNode) {
    return {
      type: 'new',
      nodeId: newNode.id,
      label: `Start ${newNode.title}`,
      reason: 'Ready for a new challenge?'
    };
  }

  return null;
}

/**
 * Logic #11: Time-Aware Environment
 */
export function getEnvironmentWarmth(): number {
  const hour = new Date().getHours();
  // Warm UI at night (20:00 - 06:00)
  if (hour >= 20 || hour < 6) return 1;
  return 0;
}

export const calculateSubjectProgress = (topics: StudyNode[]): number => {
  if (!topics || topics.length === 0) return 0;
  const totalCompletion = topics.reduce((acc, topic) => acc + (topic.completion || 0), 0);
  const average = totalCompletion / topics.length;
  return Math.round(average * 10) / 10;
};
