import { AppSettings, AppState, StudySession, StudyNode } from '../types';
import { loadState, saveState } from '../store';

export const Echoless = {
  getState(): AppState {
    return loadState();
  },

  saveState(state: AppState): void {
    saveState(state);
  },

  getSyllabus(): Record<string, StudyNode> {
    return loadState().nodes;
  },

  getSettings(): AppSettings {
    return loadState().settings;
  },

  startFocus(nodeId: string) {
    const state = loadState();
    return {
      node: state.nodes[nodeId] ?? null,
      settings: state.settings,
      startTime: Date.now(),
    };
  },

  updateSettings(settings: Partial<AppSettings>): AppState {
    const state = loadState();
    const next = { ...state, settings: { ...state.settings, ...settings } };
    saveState(next);
    return next;
  },

  addSession(session: StudySession): AppState {
    const state = loadState();
    const next = { ...state, sessions: [...state.sessions, session] };
    saveState(next);
    return next;
  },
};
