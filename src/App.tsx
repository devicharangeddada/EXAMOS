/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
  BarChart3, 
  Settings as SettingsIcon,
  Timer,
  ChevronLeft,
  Search,
  User,
  Activity
} from 'lucide-react';
import { AppState, StudyNode, StudySession } from './types';
import { loadState, saveState } from './store';
import Dashboard from './components/Dashboard';
import Syllabus from './components/Syllabus';
import FocusRoom from './components/FocusRoom';
import Flashcards from './components/Flashcards';
import Stats from './components/Stats';
import Settings from './components/Settings';
import FloatingNav from './components/FloatingNav';
import { cn } from './lib/utils';

import Onboarding from './components/Onboarding';

type Page = 'dashboard' | 'syllabus' | 'focus' | 'flashcards' | 'stats' | 'settings';

export default function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Migration for attachments
  useEffect(() => {
    setState(prev => {
      let changed = false;
      const nextNodes = { ...prev.nodes };
      Object.keys(nextNodes).forEach(id => {
        if (!nextNodes[id].attachments) {
          nextNodes[id].attachments = [];
          changed = true;
        }
      });
      if (changed) return { ...prev, nodes: nextNodes };
      return prev;
    });
  }, []);

  // Persistence
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Track interrupted session
  useEffect(() => {
    if (currentPage === 'focus' && state.activeSlotId) {
      setState(prev => ({
        ...prev,
        interruptedSession: {
          nodeId: state.activeSlotId!,
          timestamp: Date.now()
        }
      }));
    } else if (currentPage !== 'focus') {
      setState(prev => ({ ...prev, interruptedSession: undefined }));
    }
  }, [currentPage, state.activeSlotId]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const appName = useMemo(() => {
    if (currentPage === 'focus') return 'ECH';
    if (windowWidth >= 768) return 'EchOS';
    return 'Echoless';
  }, [windowWidth, currentPage]);

  // State Updaters
  const updateNodes = (updater: (nodes: Record<string, StudyNode>) => Record<string, StudyNode>) => {
    setState(prev => ({ ...prev, nodes: updater(prev.nodes) }));
  };

  const addSession = (session: StudySession) => {
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    setState(prev => {
      const node = prev.nodes[session.nodeId];
      if (!node) return { ...prev, sessions: [...prev.sessions, session] };
      
      const updatedNode = {
        ...node,
        focusDifficulty: difficultyMap[session.difficulty],
        lastInteraction: new Date().toISOString()
      };
      
      return {
        ...prev,
        sessions: [...prev.sessions, session],
        nodes: { ...prev.nodes, [session.nodeId]: updatedNode }
      };
    });
  };

  const updateSettings = (settings: Partial<AppState['settings']>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  };

  const handleImportState = (nextState: AppState) => {
    setState(nextState);
  };

  const setExamDate = (date: string) => {
    setState(prev => ({ 
      ...prev, 
      onboarding: { ...prev.onboarding, examDate: date } 
    }));
  };

  // Focus Mode Environment Trigger
  useEffect(() => {
    if (currentPage === 'focus') {
      document.documentElement.setAttribute('data-env', 'sanctuary');
    } else {
      document.documentElement.removeAttribute('data-env');
    }
  }, [currentPage]);

  const themeClass = useMemo(() => {
    let theme = state.settings.theme;
    if (theme === 'auto') {
      const hour = new Date().getHours();
      theme = (hour >= 20 || hour < 6) ? 'night' : 'light';
    }
    switch (theme) {
      case 'dark': return 'theme-dark';
      case 'night': return 'theme-night';
      default: return 'theme-light';
    }
  }, [state.settings.theme]);

  // Logic #5: Night Mode Detail - Slower animations
  const transitionDuration = useMemo(() => {
    const isNight = themeClass === 'theme-night';
    return isNight ? 0.275 : 0.25; // ~10% slower
  }, [themeClass]);

  const [flashcardMode, setFlashcardMode] = useState<'normal' | 'weak-only'>('normal');

  // Logic #1: Attention Engine - Track last interaction
  const handlePageChange = (page: Page, nodeId?: string, mode: 'normal' | 'weak-only' = 'normal') => {
    setCurrentPage(page);
    setFlashcardMode(mode);
    if (nodeId) {
      setState(prev => ({ ...prev, activeSlotId: nodeId }));
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const renderPage = () => {
    if (!state.onboarding.completed) {
      return <Onboarding onComplete={(onboarding, nodes) => {
        setState(prev => ({ 
          ...prev, 
          onboarding: { ...onboarding, completed: true }, 
          nodes 
        }));
      }} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
          state={state} 
          onSelectSubject={(id) => {
            handlePageChange('syllabus', id);
          }} 
          onAction={(type, nodeId) => {
            if (type === 'flashcards' && !nodeId) {
              handlePageChange('flashcards', undefined, 'weak-only');
            } else {
              handlePageChange(type, nodeId);
            }
          }}
        />;
      case 'syllabus':
        return <Syllabus 
          nodes={state.nodes} 
          updateNodes={updateNodes}
          activeNodeId={state.activeSlotId}
          onStartFocus={(id) => {
            handlePageChange('focus', id);
          }}
          onSelectNode={(id) => {
            setState(prev => ({ ...prev, activeSlotId: id }));
          }}
          onRecall={(id) => {
            handlePageChange('flashcards', id);
          }}
        />;
      case 'focus':
        return <FocusRoom 
          activeNodeId={state.activeSlotId} 
          nodes={state.nodes}
          settings={state.settings}
          onComplete={(session) => {
            addSession(session);
            setCurrentPage('syllabus');
          }}
          onCancel={() => setCurrentPage('syllabus')}
        />;
      case 'flashcards':
        return <Flashcards 
          nodes={state.nodes} 
          updateNodes={updateNodes}
          initialMode={flashcardMode}
          onFinish={() => setCurrentPage('dashboard')}
        />;
      case 'stats':
        return <Stats state={state} />;
      case 'settings':
        return <Settings 
          settings={state.settings} 
          updateSettings={updateSettings}
          setExamDate={setExamDate}
          examDate={state.onboarding.examDate}
          onReset={() => setShowResetModal(true)}
          onImportState={handleImportState}
        />;
      default:
        return <Dashboard 
          state={state} 
          onSelectSubject={(id) => handlePageChange('syllabus', id)} 
          onAction={(type, nodeId) => handlePageChange(type, nodeId)}
        />;
    }
  };

  const isMobile = windowWidth < 768;

  const navItems = isMobile
    ? [
        { id: 'syllabus', icon: BookOpen, label: 'Map' },
        { id: 'focus', icon: Timer, label: 'Arena' },
      ]
    : [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
        { id: 'syllabus', icon: BookOpen, label: 'Syllabus' },
        { id: 'focus', icon: Timer, label: 'Focus' },
        { id: 'flashcards', icon: Zap, label: 'Recall' },
        { id: 'stats', icon: BarChart3, label: 'Stats' },
      ];

  const densityClass = `density-${state.settings.density || 'default'}`;

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", themeClass, densityClass)}>
      {/* Top Layer (Fixed Header) */}
      <header className={cn(
        "glass-header px-4 flex items-center justify-between border-b border-border-color",
        currentPage === 'focus' && "hidden"
      )}>
        <div className="flex items-center">
          {currentPage !== 'dashboard' && (
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="w-11 h-11 flex items-center justify-center -ml-2 hover:bg-action-light/50 dark:hover:bg-action-dark/50 rounded-full transition-all active:scale-[0.96] duration-150 text-primary"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-md bg-accent/10 flex items-center justify-center text-accent font-bold text-[11px] tracking-tight">
              EO
            </div>
            <div className="flex flex-col">
              <h1 className="text-[16px] font-medium tracking-[0.2px] text-primary truncate">
                EchOS
              </h1>
              <span className="text-[10px] text-tertiary">Developed by imdvichrn &amp; Echoless</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center">
            <button 
              onClick={() => setCurrentPage('settings')}
              className={cn(
                "w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-[0.96] duration-150",
                currentPage === 'settings' 
                  ? "text-accent" 
                  : "text-secondary hover:text-primary hover:bg-action-light/50 dark:hover:bg-action-dark/50"
              )}
              aria-label="Settings"
            >
              <SettingsIcon size={20} fill={currentPage === 'settings' ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </header>

      {/* Middle Layer (Fluid Content Area) */}
      <main className={cn(
        "flex-1 overflow-y-auto px-medium pb-32 max-w-4xl mx-auto w-full scroll-smooth",
        currentPage === 'focus' ? "p-0 max-w-none" : "pt-header"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: transitionDuration, ease: "easeOut" }}
            className="min-h-full"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Island Navigation */}
      {currentPage !== 'focus' && (
        <FloatingNav 
          items={navItems}
          activeTab={currentPage}
          onTabChange={(id) => setCurrentPage(id as Page)}
        />
      )}

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-medium">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative surface-card p-large max-w-sm w-full space-y-medium shadow-2xl"
            >
              <div className="space-y-nano">
                <h3 className="title-lg">Factory Reset</h3>
                <p className="body-md opacity-60">
                  This will permanently delete all your study nodes, sessions, and settings. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-small">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="secondary-button flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReset}
                  className="primary-button flex-1 !bg-error !text-white"
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

