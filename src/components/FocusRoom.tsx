import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudyNode, AppSettings, StudySession } from '../types';
import { Play, Pause, Volume2, VolumeX, ChevronLeft, X, AlertCircle, Lock } from 'lucide-react';
import { useHaptics } from '../lib/haptics';
import LiquidButton from './LiquidButton';
import { useFocusSession } from '../hooks/useFocusSession';

interface FocusRoomProps {
  activeNodeId: string | null;
  nodes: Record<string, StudyNode>;
  settings: AppSettings;
  onComplete: (session: StudySession) => void;
  onCancel: () => void;
  onFocusActiveChange?: (active: boolean) => void;
}

function StreakFlame({ seconds, isActive }: { seconds: number; isActive: boolean }) {
  const intensity = Math.min(1, seconds / 300);
  const flameHeight = 22 + intensity * 36;
  const opacity = isActive ? 0.3 + intensity * 0.7 : 0.18;
  const hue = Math.round(26 + intensity * 22);

  return (
    <motion.div
      animate={isActive ? { y: [0, -2, 1, -1, 0] } : {}}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="flex flex-col items-center gap-1"
    >
      <svg width="26" height={flameHeight} viewBox={`0 0 26 ${flameHeight}`} style={{ opacity }}>
        <defs>
          <radialGradient id="flameGrad" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor={`hsl(${hue}, 100%, 70%)`} />
            <stop offset="55%" stopColor={`hsl(${hue + 6}, 100%, 52%)`} />
            <stop offset="100%" stopColor={`hsl(${hue + 14}, 90%, 32%)`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d={`M13,${flameHeight} C4,${flameHeight * 0.86} 2,${flameHeight * 0.6} 7,${flameHeight * 0.38} C5,${flameHeight * 0.22} 9,${flameHeight * 0.08} 11,0 C13,${flameHeight * 0.14} 15,${flameHeight * 0.07} 17,${flameHeight * 0.28} C21,${flameHeight * 0.1} 24,${flameHeight * 0.34} 22,${flameHeight * 0.58} C24,${flameHeight * 0.8} 22,${flameHeight * 0.92} 13,${flameHeight}`}
          fill="url(#flameGrad)"
        />
      </svg>
      <span className="text-[10px] font-medium tabular-nums" style={{ color: `hsl(${hue}, 90%, 67%)`, opacity }}>
        {Math.floor(seconds / 60)}m
      </span>
    </motion.div>
  );
}

function NeuralMapOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.32, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
        >
          <svg viewBox="0 0 360 110" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="neuralGradient" x1="0%" y1="20%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="rgba(111, 111, 255, 0.16)" />
                <stop offset="100%" stopColor="rgba(161, 94, 255, 0.04)" />
              </linearGradient>
            </defs>
            <path d="M16 90 C100 18 250 18 344 24" fill="none" stroke="url(#neuralGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 22" />
            <circle cx="16" cy="90" r="4" fill="rgba(111,111,255,0.8)" />
            <circle cx="344" cy="24" r="4" fill="rgba(161,94,255,0.8)" />
          </svg>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TimerArena({
  isActive,
  targetSeconds,
  registerTick,
}: {
  isActive: boolean;
  targetSeconds: number;
  registerTick: (callback: (seconds: number) => void) => () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
    }
  }, [isActive]);

  useEffect(() => {
    const unsubscribe = registerTick(setSeconds);
    return unsubscribe;
  }, [registerTick]);

  const progress = Math.min(1, seconds / targetSeconds);
  const remaining = Math.max(0, targetSeconds - seconds);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 w-full max-w-[420px] py-8">
      <div className="relative flex items-center justify-center w-full">
        <svg width="100%" height="90" viewBox="0 0 360 90" className="absolute top-0 left-0 opacity-20 pointer-events-none">
          <path d="M20,70 C100,10 260,10 340,40" fill="none" stroke="rgba(111,111,255,0.18)" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 16" />
        </svg>

        <div className="absolute inset-0 rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_35px_80px_rgba(0,0,0,0.45)]" />

        <div className="relative flex flex-col items-center gap-5 px-6 py-8">
          <StreakFlame seconds={seconds} isActive={isActive} />

          <div className="relative flex items-center justify-center">
            <svg width="240" height="240" viewBox="0 0 240 240" className="absolute -rotate-90">
              <circle cx="120" cy="120" r="118" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
              <motion.circle
                cx="120"
                cy="120"
                r="118"
                fill="none"
                stroke="rgba(111,111,255,0.88)"
                strokeWidth="1.5"
                strokeDasharray={2 * Math.PI * 118}
                animate={{ strokeDashoffset: 2 * Math.PI * 118 * (1 - progress) }}
                transition={{ duration: 0.4, ease: 'linear' }}
                strokeLinecap="round"
              />
            </svg>

            <div className="relative z-10 text-center">
              <motion.div
                animate={isActive ? { scale: [1, 1.008, 1] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="tabular-nums leading-none"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  fontSize: '4rem',
                  fontWeight: 200,
                  letterSpacing: '-0.045em',
                  color: '#FFFFFF',
                  textShadow: isActive ? '0 0 45px rgba(111,111,255,0.24)' : 'none',
                }}
              >
                {formatTime(seconds)}
              </motion.div>
              <motion.div
                animate={isActive ? { opacity: [0.24, 0.5, 0.24] } : { opacity: 0.28 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-2 text-[12px] uppercase tracking-[0.24em] text-white/60"
              >
                {formatTime(remaining)} remaining
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoizedTimerArena = memo(TimerArena);

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function LiquidVolumePillar({ volume, onVolumeChange }: { volume: number; onVolumeChange: (v: number) => void }) {
  const { pulse } = useHaptics();
  const pillarRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (clientY: number) => {
    const rect = pillarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, ratio));
    const next = Math.round(clamped * 100);
    const milestones = [0, 50, 100];
    if (milestones.includes(next)) {
      pulse(next === 50 ? 'light' : 'heavy');
    }
    onVolumeChange(next);
  };

  const t = volume / 100;
  const topColor = `rgb(${Math.round(29 + t * 95)},${Math.round(78 - t * 19)},${Math.round(216 - t * 63)})`;
  const botColor = `rgb(${Math.round(91 + t * 33)},${Math.round(33 - t * 10)},${Math.round(182 + t * 37)})`;

  return (
    <div className="flex flex-col items-center gap-2">
      <VolumeX size={13} className="text-tertiary" />
      <div
        ref={pillarRef}
        className="h-36 w-5 rounded-full relative overflow-hidden cursor-pointer select-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        onMouseDown={(e) => {
          handleInteraction(e.clientY);
          const move = (ev: MouseEvent) => handleInteraction(ev.clientY);
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        onTouchStart={(e) => handleInteraction(e.touches[0].clientY)}
        onTouchMove={(e) => handleInteraction(e.touches[0].clientY)}
      >
        <motion.div
          animate={{ height: `${volume}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ background: `linear-gradient(180deg, ${topColor}, ${botColor})` }}
        />
        {volume > 5 && (
          <motion.div
            animate={{ height: `${volume}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 flex items-start"
          >
            <div className="w-full h-[1px] rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          </motion.div>
        )}
      </div>
      <Volume2 size={13} className="text-tertiary" />
    </div>
  );
}

function AmbientHUD({
  isActive,
  isSoundOn,
  currentSound,
  volume,
  onToggleSound,
  onNextSound,
}: {
  isActive: boolean;
  isSoundOn: boolean;
  currentSound: string;
  volume: number;
  onToggleSound: () => void;
  onNextSound: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute left-1/2 bottom-[calc(env(safe-area-inset-bottom,16px)+12px)] -translate-x-1/2 w-[min(92vw,420px)] rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl px-4 py-3 flex items-center justify-between gap-3 text-[12px] text-white z-30"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
    >
      <div className="flex flex-col gap-[2px]">
        <span className="font-semibold tracking-[0.15em] uppercase text-[10px] text-secondary">Ambient</span>
        <span className="font-medium truncate">{currentSound} · {volume}%</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onNextSound} className="rounded-full px-3 py-2 bg-white/10 text-[11px] font-medium transition hover:bg-white/15">
          Switch
        </button>
        <button onClick={onToggleSound} className="rounded-full px-3 py-2 bg-white/10 text-[11px] font-medium transition hover:bg-white/15">
          {isSoundOn ? 'Silence' : 'Unmute'}
        </button>
      </div>
    </motion.div>
  );
}

export default function FocusRoom({ activeNodeId, nodes, settings, onComplete, onCancel, onFocusActiveChange }: FocusRoomProps) {
  const [isAuroraActive, setIsAuroraActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [completed, setCompleted] = useState(true);
  const [longPressActive, setLongPressActive] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [summaryDuration, setSummaryDuration] = useState(0);

  const longPressTimer = useRef<number | null>(null);
  const auroraTimeout = useRef<number | null>(null);
  const node = activeNodeId ? nodes[activeNodeId] : null;
  const { pulse } = useHaptics();

  const handleTimerComplete = (duration: number) => {
    setSummaryDuration(duration);
    setShowSummary(true);
  };

  const {
    isActive,
    isSilenced,
    isAudioSuspended,
    volume,
    currentSoundLabel,
    start,
    pause,
    end,
    toggleSilence,
    cycleSound,
    setVolume,
    registerTick,
    getElapsedSeconds,
  } = useFocusSession({ settings, activeNodeId, onTimerComplete: handleTimerComplete });

  useEffect(() => {
    onFocusActiveChange?.(isActive);
  }, [isActive, onFocusActiveChange]);

  useEffect(() => {
    return () => {
      if (auroraTimeout.current) {
        window.clearTimeout(auroraTimeout.current);
      }
    };
  }, []);

  const handleToggleActive = async () => {
    if (!isActive) {
      await start();
      pulse('light');
      return;
    }

    pause();
    pulse('light');
  };

  const handleEnd = () => {
    pause();
    setSummaryDuration(getElapsedSeconds());
    setShowSummary(true);
  };

  const handleLongPressStart = () => {
    if (!isActive) return;
    setLongPressActive(true);
    setLongPressProgress(0);
    const startTime = Date.now();

    longPressTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setLongPressProgress(progress);

      if (progress >= 100) {
        if (longPressTimer.current) {
          window.clearInterval(longPressTimer.current);
          longPressTimer.current = null;
        }
        pulse('heavy');
        handleEnd();
      }
    }, 16);
  };

  const handleLongPressEnd = () => {
    setLongPressActive(false);
    setLongPressProgress(0);
    if (longPressTimer.current) {
      window.clearInterval(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCancel = () => {
    if (settings.strictMode && isActive) return;
    pause();
    onCancel();
  };

  const handleFinish = () => {
    if (!activeNodeId) return;

    const session: StudySession = {
      id: Math.random().toString(36).substring(7),
      nodeId: activeNodeId,
      startTime: Date.now() - summaryDuration * 1000,
      duration: summaryDuration,
      completed,
      difficulty,
    };

    setIsAuroraActive(true);
    pause();
    setShowSummary(false);

    if (auroraTimeout.current) {
      window.clearTimeout(auroraTimeout.current);
    }

    auroraTimeout.current = window.setTimeout(() => {
      setIsAuroraActive(false);
      onComplete(session);
    }, 2600);
  };

  const targetSeconds = useMemo(() => Math.max(1, (settings.pomodoroLength || 25) * 60), [settings.pomodoroLength]);
  const showNeuralMap = Boolean(node?.parentId || node?.title);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#121128_0%,transparent_30%),radial-gradient(circle_at_bottom,#0A0A0B_0%,transparent_45%)]" />

      <NeuralMapOverlay visible={showNeuralMap && isActive} />

      {isAuroraActive && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 20% 20%, rgba(94,92,230,0.85), transparent 24%), radial-gradient(circle at 80% 25%, rgba(255,142,66,0.55), transparent 18%), radial-gradient(circle at 50% 78%, rgba(138,43,226,0.32), transparent 22%)',
            }}
          />
          <div className="relative z-10 text-center space-y-4 px-6">
            <p className="text-[13px] uppercase tracking-[0.35em] text-accent">Focus Reward</p>
            <h1 className="text-[48px] font-light tracking-tight tabular-nums leading-none text-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              Aurora Wash
            </h1>
            <p className="max-w-md text-[13px] text-white/70">
              Your focus session completed. Returning to the dashboard with a calming gradient reward.
            </p>
          </div>
        </div>
      )}

      {showSummary && !isAuroraActive && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#0A0A0B] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="text-center space-y-3">
              <p className="text-[13px] font-medium text-white/60">Echoless — Session Complete</p>
              <p className="text-[52px] font-extralight tracking-tight tabular-nums leading-none text-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {formatTime(summaryDuration)}
              </p>
              <p className="text-[11px] text-white/60">
                {settings.pomodoroLength}m target · {Math.round((summaryDuration / targetSeconds) * 100)}% achieved
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-center gap-3">
                {(['easy', 'medium', 'hard'] as const).map((option) => (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={() => setDifficulty(option)}
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center transition-all"
                    style={{
                      background: difficulty === option ? 'rgba(52,199,89,0.08)' : '#0A0A0B',
                      borderColor: difficulty === option ? 'rgba(52,199,89,0.4)' : '#1F1F22',
                      color: difficulty === option ? '#34C759' : '#A1A1AA',
                      boxShadow: difficulty === option ? '0 0 18px rgba(52,199,89,0.16)' : 'none',
                    }}
                  >
                    <span className="text-[10px] uppercase font-medium">{option[0]}</span>
                  </motion.button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[12px] text-center text-white/60">Did you complete your goal?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCompleted(true)}
                    className="flex-1 h-10 rounded-xl border text-xs font-medium transition-all"
                    style={{
                      background: completed ? 'rgba(52,199,89,0.08)' : '#0A0A0B',
                      borderColor: completed ? 'rgba(52,199,89,0.4)' : '#1F1F22',
                      color: completed ? '#34C759' : '#A1A1AA',
                    }}
                  >
                    Goal Met
                  </button>
                  <button
                    onClick={() => setCompleted(false)}
                    className="flex-1 h-10 rounded-xl border text-xs font-medium transition-all"
                    style={{
                      background: !completed ? 'rgba(255,69,58,0.08)' : '#0A0A0B',
                      borderColor: !completed ? 'rgba(255,69,58,0.4)' : '#1F1F22',
                      color: !completed ? '#FF453A' : '#A1A1AA',
                    }}
                  >
                    Incomplete
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={handleFinish}
                className="w-full h-12 rounded-xl font-medium text-white"
                style={{ background: 'var(--color-accent)', boxShadow: '0 0 30px rgba(74,144,226,0.2)' }}
              >
                Log Session
              </motion.button>
              <button
                onClick={() => setShowSummary(false)}
                className="w-full h-10 rounded-xl text-[11px] uppercase tracking-[0.2em] font-medium text-white/60 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <button
        onClick={handleCancel}
        className="absolute left-4 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', color: '#9CA3AF' }}
      >
        {settings.strictMode && isActive ? <Lock size={16} /> : <ChevronLeft size={20} />}
      </button>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1000px] flex-col items-center justify-center px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,24px)+96px)]">
        <MemoizedTimerArena isActive={isActive} targetSeconds={targetSeconds} registerTick={registerTick} />

        <motion.div
          animate={{ opacity: isActive ? 0.32 : 1, y: isActive ? 48 : 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute bottom-[calc(env(safe-area-inset-bottom,16px)+16px)] flex w-full max-w-[420px] flex-col items-center gap-6"
        >
          <div className="absolute right-6 top-[-52px] z-40">
            <LiquidVolumePillar volume={volume} onVolumeChange={setVolume} />
          </div>

          <div className="flex items-center gap-6">
            <LiquidButton onClick={handleToggleActive} className="w-16 h-16 rounded-full p-0">
              {isActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </LiquidButton>

            {!isActive && (
              <button
                onClick={handleCancel}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,69,58,0.08)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.22)' }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="relative w-full px-8">
            <button
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              className="w-full h-12 rounded-full border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.2em] font-medium text-white transition-colors"
            >
              {isActive ? 'Hold to End' : 'Cancel'}
            </button>
            {longPressActive && (
              <div className="absolute bottom-0 left-8 right-8 h-[2px] overflow-hidden rounded-full bg-white/10">
                <motion.div animate={{ width: `${longPressProgress}%` }} className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
              </div>
            )}
          </div>
        </motion.div>

        {isActive && (
          <AmbientHUD
            isActive={isActive}
            isSoundOn={!isSilenced}
            currentSound={currentSoundLabel}
            volume={volume}
            onToggleSound={toggleSilence}
            onNextSound={cycleSound}
          />
        )}

        <AnimatePresence>
          {isAudioSuspended && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute bottom-32 px-6 py-3 rounded-2xl flex items-center gap-3 z-[110]"
              style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.28)', backdropFilter: 'blur(12px)', color: '#FF453A' }}
            >
              <AlertCircle size={16} />
              <span className="text-xs font-medium">Audio suspended — tap to resume</span>
              <button
                onClick={async () => {
                  await start().catch(() => {});
                }}
                className="px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider text-white"
                style={{ background: '#FF453A' }}
              >
                Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
