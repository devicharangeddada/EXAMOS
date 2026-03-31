/**
 * useEchOS
 * Central state hook for EchOS. Handles persistence, navigation guards, settings updates,
 * and exposes a clean interface for app-level logic and eventual API export.
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState, AppSettings, StudyNode, StudySession } from '../types';
import { loadState, saveState } from '../store';

export type Page = 'dashboard' | 'syllabus' | 'focus' | 'flashcards' | 'stats' | 'settings';

export function useEchOS() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isFocusActive, setIsFocusActive] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (currentPage === 'focus') {
      document.documentElement.setAttribute('data-env', 'sanctuary');
    } else {
      document.documentElement.removeAttribute('data-env');
    }
  }, [currentPage]);

  useEffect(() => {
    document.documentElement.dataset.gpu = state.settings.gpuAcceleration ? 'true' : 'false';
  }, [state.settings.gpuAcceleration]);

  useEffect(() => {
    if (state.settings.strictMode && isFocusActive && currentPage !== 'focus') {
      setCurrentPage('focus');
    }
  }, [state.settings.strictMode, isFocusActive, currentPage]);

  const updateNodes = (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => {
    setState(prev => ({ ...prev, nodes: updater(prev.nodes) }));
  };

  const addSession = (session: StudySession) => {
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    setState(prev => {
      const node = prev.nodes[session.nodeId];
      if (!node) return { ...prev, sessions: [...prev.sessions, session] };
      return {
        ...prev,
        sessions: [...prev.sessions, session],
        nodes: {
          ...prev.nodes,
          [session.nodeId]: {
            ...node,
            focusDifficulty: difficultyMap[session.difficulty],
            lastInteraction: new Date().toISOString(),
          },
        },
      };
    });
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  };

  const setExamDate = (date: string) => {
    setState(prev => ({ ...prev, onboarding: { ...prev.onboarding, examDate: date } }));
  };

  const completeOnboarding = (onboarding: AppState['onboarding'], nodes: Record<string, StudyNode>) => {
    setState(prev => ({ ...prev, onboarding: { ...onboarding, completed: true }, nodes }));
  };

  const setActiveSlotId = (nodeId: string | null) => {
    setState(prev => ({ ...prev, activeSlotId: nodeId }));
  };

  const handleImportState = (nextState: AppState) => {
    setState(nextState);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handlePageChange = (page: Page, nodeId?: string, mode: 'normal' | 'weak-only' = 'normal') => {
    if (currentPage === 'focus' && state.settings.strictMode && isFocusActive && page !== 'focus') {
      return;
    }
    setCurrentPage(page);
    if (nodeId) {
      setState(prev => ({ ...prev, activeSlotId: nodeId }));
    }
    if (page !== 'focus' && mode === 'weak-only') {
      // keep page state; flashcards mode handled by page component
    }
  };

  const isNavLocked = currentPage === 'focus' && state.settings.strictMode && isFocusActive;

  const themeClass = useMemo(() => {
    let theme = state.settings.theme;
    if (theme === 'auto') {
      const hour = new Date().getHours();
      theme = hour >= 20 || hour < 6 ? 'night' : 'light';
    }
    switch (theme) {
      case 'dark': return 'theme-dark';
      case 'night': return 'theme-night';
      default: return 'theme-light';
    }
  }, [state.settings.theme]);

  return {
    state,
    currentPage,
    setCurrentPage,
    isFocusActive,
    setIsFocusActive,
    updateNodes,
    addSession,
    updateSettings,
    setExamDate,
    completeOnboarding,
    setActiveSlotId,
    handleImportState,
    handleReset,
    handlePageChange,
    isNavLocked,
    themeClass,
  };
}
