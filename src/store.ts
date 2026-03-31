import { AppState, StudyNode, Note, StudySession, AppSettings } from './types';

export const STORAGE_KEY = 'examflow_os_data';

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
    volume: 0.5,
    autoPlay: false,
    timeFormat: '12h',
    pomodoroLength: 25,
    breakLength: 5,
    strictMode: false,
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
      settings: {
        ...DEFAULT_STATE.settings,
        ...parsed.settings,
        // Ensure new fields have defaults
        pomodoroLength: parsed.settings?.pomodoroLength ?? 25,
        breakLength: parsed.settings?.breakLength ?? 5,
        strictMode: parsed.settings?.strictMode ?? false,
      }
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
