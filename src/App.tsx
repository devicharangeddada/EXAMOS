import { useState, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
  BarChart3, 
  Settings as SettingsIcon,
  Timer,
  ChevronLeft,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
const Syllabus = lazy(() => import('./features/syllabus/SyllabusMap'));
const FocusRoom = lazy(() => import('./components/FocusRoom'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const Stats = lazy(() => import('./components/Stats'));
const Settings = lazy(() => import('./components/Settings'));
import FloatingNav from './components/FloatingNav';
import { cn } from './lib/utils';
import Onboarding from './components/Onboarding';
import { focusAudio } from './services/FocusAudioContext';
import { useEchOS, Page } from './hooks/useEchOS';

export default function App() {
  const {
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
  } = useEchOS();

  const [flashcardMode, setFlashcardMode] = useState<'normal' | 'weak-only'>('normal');
  const [showResetModal, setShowResetModal] = useState(false);

  const transitionDuration = useMemo(() => {
    return themeClass === 'theme-night' ? 0.5 : 0.3;
  }, [themeClass]);

  const appName = useMemo(() => {
    const activeNode = state.activeSlotId ? state.nodes[state.activeSlotId] : undefined;
    return activeNode?.title || 'EchOS';
  }, [state.activeSlotId, state.nodes]);

  const renderPage = () => {
    if (!state.onboarding.completed) {
      return <Onboarding onComplete={(onboarding, nodes) => {
        completeOnboarding(onboarding, nodes);
      }} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard
          state={state}
          onSelectSubject={(id) => handlePageChange('syllabus', id)}
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
          onStartFocus={async (id) => {
            await focusAudio.resume().catch(() => {});
            handlePageChange('focus', id);
          }}
          onSelectNode={(id) => setActiveSlotId(id)}
          onRecall={(id) => handlePageChange('flashcards', id)}
        />;
      case 'focus':
        return <FocusRoom
          activeNodeId={state.activeSlotId}
          nodes={state.nodes}
          settings={state.settings}
          onFocusActiveChange={setIsFocusActive}
          onComplete={(session) => {
            addSession(session);
            setIsFocusActive(false);
            setCurrentPage('syllabus');
          }}
          onCancel={() => {
            setIsFocusActive(false);
            setCurrentPage('syllabus');
          }}
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

  // All 5 nav items on both mobile and desktop
  const navItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Home' },
    { id: 'syllabus',   icon: BookOpen,         label: 'Map' },
    { id: 'focus',      icon: Timer,            label: 'Focus' },
    { id: 'flashcards', icon: Zap,              label: 'Recall' },
    { id: 'stats',      icon: BarChart3,        label: 'Stats' },
  ];

  const densityClass = `density-${state.settings.density || 'default'}`;

  const pageContent = renderPage();

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", themeClass, densityClass)}>
      {/* Fixed Header */}
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
            <div className="flex flex-col min-w-0">
              <h1 className="text-[16px] font-medium tracking-tight text-primary truncate">{appName}</h1>
              <span className="text-[10px] text-tertiary truncate max-w-[180px]">Developed by imdvichrn &amp; Echoless</span>
            </div>
          </div>
        </div>

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
      </header>

      {/* Content Area */}
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
            <Suspense fallback={<div className="flex min-h-[320px] items-center justify-center"><span className="body-md text-secondary">Loading…</span></div>}>
              {pageContent}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Nav — hidden on focus page */}
      {currentPage !== 'focus' && (
        <FloatingNav
          items={navItems}
          activeTab={currentPage}
          onTabChange={(id) => handlePageChange(id as Page)}
          locked={isNavLocked}
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
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative surface-card p-large max-w-sm w-full space-y-medium shadow-2xl"
            >
              <div className="space-y-nano">
                <h3 className="title-lg">Factory Reset</h3>
                <p className="body-md opacity-60">
                  This will permanently delete all your study nodes, sessions, and settings. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-small">
                <button onClick={() => setShowResetModal(false)} className="secondary-button flex-1">Cancel</button>
                <button onClick={handleReset} className="primary-button flex-1 !bg-error !text-white">Reset All</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
