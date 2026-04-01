export type NodeStatus = 'not-started' | 'in-progress' | 'done' | 'revise';

export interface Note {
  id: string;
  text: string;
  details?: string;
  confidence: number;
  level: number;
  lastSeen?: string;
  nextDue?: string;
  streak: number;
  failCount: number;
  wrongCount: number;
  urgencyScore: number;
  /** Leitner System: 0-4 box index (0 = learning, 4 = elite/mastered) */
  leitnerBox?: number;
  lastLeitnerMoveAt?: string;
  /** Feynman Technique */
  feynman?: {
    simpleExplanation?: string;
    identifiedGaps?: string;
  };
  /** SQ3R metadata */
  sq3r?: {
    survey?: string;
    questions?: string;
    keyPoints?: string;
    reciteSummary?: string;
    reviewNotes?: string;
  };
  /** Blurting method */
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
  weight: number;
  lastInteraction?: string;
  focusDifficulty: number;
  failCount: number;
  isPriority: boolean;
  completion: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'night' | 'auto';
  density: 'compact' | 'default' | 'comfortable';
  soundType: 'white' | 'rain' | 'brown' | 'cafe';
  soundMute: boolean;
  volume: number;
  autoPlay: boolean;
  autoStartBreaks: boolean;
  timeFormat: '12h' | '24h';
  pomodoroLength: number;   // in minutes, default 25
  breakLength: number;      // in minutes, default 5
  strictMode: boolean;      // lock navigation during focus
  dailyGoalReminder: boolean; // quiet reminders when goal is pending
  streakProtection: boolean;  // streak expiry alerts
  urgencyAlerts: boolean;     // exam countdown and urgency signals
  notificationsEnabled: boolean; // master notification permission toggle
  gpuAcceleration: boolean;   // enable hardware rendering hints
  hapticFeedback: boolean;    // simulated haptics on interaction
  activeStudyMethod: 'pomodoro' | 'deep-work' | '52-17' | 'flowtime' | 'time-blocking' | 'active-recall' | 'spaced-repetition' | 'blurting' | 'feynman' | 'leitner' | 'SQ3R' | 'mind-mapping';
}

export interface StudySession {
  id: string;
  nodeId: string;
  startTime: number;
  duration: number;
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OnboardingData {
  examName: string;
  examDate: string;
  subjects: string[];
  dailyAvailability: number;
  completed: boolean;
}

export interface AppState {
  onboarding: OnboardingData;
  nodes: Record<string, StudyNode>;
  sessions: StudySession[];
  settings: AppSettings;
  activeSlotId: string | null;
  lastSync?: string;
  interruptedSession?: {
    nodeId: string;
    timestamp: number;
  };
}
