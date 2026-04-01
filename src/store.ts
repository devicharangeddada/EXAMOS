import { AppState, StudyNode, Note, StudySession, AppSettings } from './types';

export const STORAGE_KEY = 'echos_os_data';

const getInitialDensity = (): 'compact' | 'default' | 'comfortable' => {
  if (typeof window === 'undefined') return 'default';
  const width = window.innerWidth;
  if (width < 380) return 'compact';
  if (width < 768) return 'default';
  return 'comfortable';
};

export const DEFAULT_STATE: AppState = {
  onboarding: {
    examName: '',
    examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    subjects: [],
    dailyAvailability: 4,
    completed: false,
  },
  nodes: {},
  sessions: [],
  settings: {
    theme: 'auto',
    density: getInitialDensity(),
    soundType: 'white',
    soundMute: false,
    volume: 0.5,
    autoPlay: false,
    autoStartBreaks: false,
    timeFormat: '12h',
    pomodoroLength: 25,
    breakLength: 5,
    strictMode: false,
    dailyGoalReminder: true,
    streakProtection: true,
    urgencyAlerts: true,
    notificationsEnabled: true,
    gpuAcceleration: false,
    hapticFeedback: true,
    activeStudyMethod: 'pomodoro',
  },
  activeSlotId: null,
};

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      onboarding: {
        ...DEFAULT_STATE.onboarding,
        ...parsed.onboarding,
      },
      settings: {
        ...DEFAULT_STATE.settings,
        ...parsed.settings,
      }
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
