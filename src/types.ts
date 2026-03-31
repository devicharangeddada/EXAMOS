export type NodeStatus = 'not-started' | 'in-progress' | 'done' | 'revise';

export interface Note {
  id: string;
  text: string;
  details?: string; // For "Hidden sub-layer"
  confidence: number; // 0-3 (0: New/Don't Know, 1: Learning, 2: Familiar, 3: Mastered)
  level: number; // 0: New, 1: Learning, 2: Familiar, 3: Mastered
  lastSeen?: string;
  nextDue?: string; // ISO String
  streak: number;
  failCount: number; // For Weakness Detection Algorithm
  wrongCount: number; // Legacy
  urgencyScore: number; // For sorting
  /** Leitner System: 0-4 box index (0 = learning, 4 = elite/mastered) */
  leitnerBox?: number;
  /** Last time this card moved between Leitner boxes (ISO string) */
  lastLeitnerMoveAt?: string;
  /** Feynman Technique: simplified explanation and gaps, authored by the student */
  feynman?: {
    simpleExplanation?: string;
    identifiedGaps?: string;
  };
  /** SQ3R metadata attached to deep-reading notes */
  sq3r?: {
    survey?: string;
    questions?: string;
    keyPoints?: string;
    reciteSummary?: string;
    reviewNotes?: string;
  };
  /** Blurting method metadata for high-intensity recall */
  blurting?: {
    lastBlurtingAt?: string;
    attempts?: number;
  };
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface StudyNode {
  id: string;
  title: string;
  parentId: string | null;
  status: NodeStatus;
  notes: Note[];
  attachments: Attachment[];
  order: number;
  weight: number; // Logic #3: Node Weight
  lastInteraction?: string;
  focusDifficulty: number; // 1-3 (easy, medium, hard)
  failCount: number; // Aggregate from notes
  isPriority: boolean; // Star-Pin Logic
  completion: number; // 0-100 (derived for parents, manual/status-based for leaves)
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'night' | 'auto';
  density: 'compact' | 'default' | 'comfortable';
  soundType: 'white' | 'rain' | 'brown';
  volume: number;
  autoPlay: boolean;
  timeFormat: '12h' | '24h';
}

export interface StudySession {
  id: string;
  nodeId: string;
  startTime: number;
  duration: number; // in seconds
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OnboardingData {
  examName: string;
  examDate: string;
  subjects: string[];
  dailyAvailability: number; // hours
  completed: boolean;
}

export interface AppState {
  onboarding: OnboardingData;
  nodes: Record<string, StudyNode>;
  sessions: StudySession[];
  settings: AppSettings;
  activeSlotId: string | null; // Logic #1: Attention Engine
  lastSync?: string;
  interruptedSession?: {
    nodeId: string;
    timestamp: number;
  };
}
