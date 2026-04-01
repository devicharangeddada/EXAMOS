import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudyNode, AppSettings, StudySession } from '../types';
import { Play, Pause, Volume2, VolumeX, Wind, Droplets, Coffee, Radio, ChevronLeft, X, AlertCircle, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { focusAudio, SoundPresetId, SOUND_PRESETS } from '../services/FocusAudioContext';
import { useHaptics } from '../lib/haptics';
import LiquidButton from './LiquidButton';

interface FocusRoomProps {
  activeNodeId: string | null;
  nodes: Record<string, StudyNode>;
  settings: AppSettings;
  onComplete: (session: StudySession) => void;
  onCancel: () => void;
  onFocusActiveChange?: (active: boolean) => void;
}

/** Streak Flame — grows in intensity as timer progresses */
function StreakFlame({ seconds, isActive }: { seconds: number; isActive: boolean }) {
  const intensity = Math.min(1, seconds / (25 * 60));
  const flameH = 24 + intensity * 32;
  const opacity = isActive ? (0.45 + intensity * 0.55) : 0.2;
  const hue = Math.round(30 - intensity * 20);

  return (
    <motion.div
      animate={isActive ? { y: [0, -2, 1, -1, 0] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="flex flex-col items-center gap-[2px]"
    >
      <svg width="24" height={flameH} viewBox={`0 0 24 ${flameH}`}
        className="flame-icon" style={{ opacity, transition: 'opacity 1.5s ease' }}>
        <defs>
          <radialGradient id="flameGrad2" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor={`hsl(${hue},100%,65%)`} />
            <stop offset="55%" stopColor={`hsl(${hue + 10},100%,50%)`} />
            <stop offset="100%" stopColor={`hsl(${hue + 20},90%,30%)`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d={`M12,${flameH} C4,${flameH * 0.85} 2,${flameH * 0.6} 6,${flameH * 0.4} C4,${flameH * 0.25} 8,${flameH * 0.1} 10,0 C12,${flameH * 0.15} 14,${flameH * 0.08} 16,${flameH * 0.3} C20,${flameH * 0.12} 22,${flameH * 0.4} 20,${flameH * 0.6} C22,${flameH * 0.8} 20,${flameH * 0.9} 12,${flameH}`}
          fill="url(#flameGrad2)"
        />
      </svg>
      {seconds > 0 && (
        <span className="text-[9px] font-medium tabular-nums" style={{ color: `hsl(${hue},90%,60%)`, opacity }}>
          {Math.floor(seconds / 60)}m
        </span>
      )}
    </motion.div>
  );
}

/** Liquid Volume Pillar: deep blue → vibrant violet */
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
    if (milestones.includes(next) && next !== volume) {
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
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
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
          <motion.div animate={{ height: `${volume}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 flex items-start">
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
  onMute,
}: {
  isActive: boolean;
  isSoundOn: boolean;
  currentSound: string;
  volume: number;
  onToggleSound: () => void;
  onNextSound: () => void;
  onMute: () => void;
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
        <button onClick={isSoundOn ? onMute : onToggleSound} className="rounded-full px-3 py-2 bg-white/10 text-[11px] font-medium transition hover:bg-white/15">
          {isSoundOn ? 'Silence' : 'Unmute'}
        </button>
      </div>
    </motion.div>
  );
}

export default function FocusRoom({ activeNodeId, nodes, settings, onComplete, onCancel, onFocusActiveChange }: FocusRoomProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(!settings.soundMute && settings.autoPlay);
  const [selectedSound, setSelectedSound] = useState<SoundPresetId>(focusAudio.getCurrentPreset() || settings.soundType as SoundPresetId || 'white');
  const [volume, setVolume] = useState(focusAudio.getVolume() * 100);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    setSelectedSound(settings.soundType as SoundPresetId);
  }, [settings.soundType]);
  const [isAuroraActive, setIsAuroraActive] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [completed, setCompleted] = useState(true);
  const [longPressActive, setLongPressActive] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);

  const longPressTimer = useRef<number | null>(null);
  const auroraTimeout = useRef<number | null>(null);
  const node = activeNodeId ? nodes[activeNodeId] : null;
  const currentSound = SOUND_PRESETS.find(p => p.id === selectedSound) || SOUND_PRESETS[0];
  const { pulse } = useHaptics();

  const pomodoroSeconds = (settings.pomodoroLength || 25) * 60;
  const glowIntensity = useMemo(() => 12 + Math.floor(seconds / 300), [seconds]);

  // Notify parent of active state changes
  useEffect(() => { onFocusActiveChange?.(isActive); }, [isActive]);

  useEffect(() => {
    let interval: any;
    if (isActive) { interval = setInterval(() => setSeconds(s => s + 1), 1000); }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (isActive && seconds >= pomodoroSeconds) {
      setIsActive(false);
      setShowSummary(true);
    }
  }, [seconds, isActive, pomodoroSeconds]);

  useEffect(() => {
    if (settings.soundMute) {
      setIsSoundOn(false);
      focusAudio.kill().catch(() => {});
    }
  }, [settings.soundMute]);

  useEffect(() => {
    if (settings.soundMute) {
      return;
    }

    if (isActive && isSoundOn) {
      focusAudio.play(selectedSound).catch(() => setIsAudioSuspended(true));
    } else {
      focusAudio.stop();
    }
  }, [isActive, isSoundOn, selectedSound, settings.soundMute]);

  useEffect(() => {
    focusAudio.setVolume(volume / 100);
  }, [volume]);

  const handleToggleActive = async () => {
    if (!isActive && !settings.soundMute) {
      await focusAudio.resume().catch(() => {});
      setIsAudioSuspended(focusAudio.isSuspended());
      pulse('light');
    }
    setIsActive(!isActive);
  };

  const handleResumeAudio = async () => {
    if (settings.soundMute) return;
    await focusAudio.resume().catch(() => {});
    setIsAudioSuspended(focusAudio.isSuspended());
    if (isActive && isSoundOn) {
      focusAudio.play(selectedSound).catch(() => setIsAudioSuspended(true));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLongPressStart = () => {
    setLongPressActive(true);
    setLongPressProgress(0);
    const start = Date.now();
    longPressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setLongPressProgress(progress);
      if (progress >= 100) { clearInterval(longPressTimer.current); handleEnd(); }
    }, 16);
  };

  const handleLongPressEnd = () => {
    setLongPressActive(false);
    setLongPressProgress(0);
    if (longPressTimer.current) clearInterval(longPressTimer.current);
  };

  const handleEnd = () => { setIsActive(false); setShowSummary(true); };

  const handleCancel = () => {
    // Strict Mode: can't cancel while active
    if (settings.strictMode && isActive) return;
    onCancel();
  };

  const handleFinish = () => {
    if (!activeNodeId) return;

    const session: StudySession = {
      id: Math.random().toString(36).substring(7),
      nodeId: activeNodeId,
      startTime: Date.now() - seconds * 1000,
      duration: seconds,
      completed,
      difficulty,
    };

    setIsAuroraActive(true);
    focusAudio.kill().catch(() => {});
    setIsActive(false);
    setShowSummary(false);

    if (auroraTimeout.current) window.clearTimeout(auroraTimeout.current);
    auroraTimeout.current = window.setTimeout(() => {
      setIsAuroraActive(false);
      onComplete(session);
    }, 3000);
  };

  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(seconds / pomodoroSeconds, 1);
  const strokeDashoffset = circumference - progress * circumference;

  useEffect(() => {
    return () => {
      if (auroraTimeout.current) {
        window.clearTimeout(auroraTimeout.current);
      }
    };
  }, []);

  if (isAuroraActive) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 20%, rgba(94,92,230,0.85), transparent 24%), radial-gradient(circle at 80% 25%, rgba(255,142,66,0.55), transparent 18%), radial-gradient(circle at 50% 78%, rgba(138,43,226,0.32), transparent 22%)'
          }}
        />
        <div className="relative z-10 text-center space-y-4 px-6">
          <p className="text-[13px] uppercase tracking-[0.35em] text-accent">Focus Reward</p>
          <h1 className="text-[48px] font-light tracking-tight tabular-nums" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Aurora Wash
          </h1>
          <p className="max-w-md text-[13px] text-white/70">
            Your focus session completed. Returning to the dashboard with a calming gradient reward.
          </p>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-large z-[100] matte-grain"
        style={{ background: '#000000' }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[24px] p-large max-w-md w-full space-y-medium border"
          style={{ background: '#0A0A0B', borderColor: '#1F1F22' }}
        >
          <div className="text-center space-y-nano">
            <p className="text-[13px] font-medium" style={{ color: '#71717A' }}>Echoless — Session Complete</p>
            <p className="text-[52px] font-light tracking-tighter tabular-nums leading-none text-white">{formatTime(seconds)}</p>
            <p className="text-[11px]" style={{ color: '#52525B' }}>{settings.pomodoroLength}m target · {Math.round((seconds / pomodoroSeconds) * 100)}% achieved</p>
          </div>

          <div className="space-y-medium">
            <div className="flex justify-center gap-medium">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <motion.button key={d}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => setDifficulty(d)}
                  className="w-12 h-12 rounded-2xl border flex items-center justify-center transition-all"
                  style={{
                    background: difficulty === d ? 'rgba(52,199,89,0.08)' : '#0A0A0B',
                    borderColor: difficulty === d ? 'rgba(52,199,89,0.4)' : '#1F1F22',
                    color: difficulty === d ? '#34C759' : '#52525B',
                    boxShadow: difficulty === d ? '0 0 20px rgba(52,199,89,0.15)' : 'none'
                  }}>
                  <span className="text-[10px] uppercase font-medium">{d[0]}</span>
                </motion.button>
              ))}
            </div>

            <div className="space-y-small">
              <p className="text-[12px] text-center" style={{ color: '#52525B' }}>Did you complete your goal?</p>
              <div className="flex gap-small">
                <button onClick={() => setCompleted(true)}
                  className="flex-1 h-10 rounded-xl border text-xs font-medium transition-all"
                  style={{ background: completed ? 'rgba(52,199,89,0.08)' : '#0A0A0B', borderColor: completed ? 'rgba(52,199,89,0.4)' : '#1F1F22', color: completed ? '#34C759' : '#52525B' }}>
                  Goal Met
                </button>
                <button onClick={() => setCompleted(false)}
                  className="flex-1 h-10 rounded-xl border text-xs font-medium transition-all"
                  style={{ background: !completed ? 'rgba(255,69,58,0.08)' : '#0A0A0B', borderColor: !completed ? 'rgba(255,69,58,0.4)' : '#1F1F22', color: !completed ? '#FF453A' : '#52525B' }}>
                  Incomplete
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-small">
            <motion.button whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={handleFinish}
              className="w-full h-12 rounded-xl font-medium text-white"
              style={{ background: 'var(--color-accent)', boxShadow: '0 0 30px rgba(74,144,226,0.2)' }}>
              Log Session
            </motion.button>
            <button onClick={onCancel}
              className="w-full h-10 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors"
              style={{ color: '#3F3F46' }}>
              Discard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      data-env="sanctuary"
      className="fixed inset-0 flex flex-col items-center justify-center z-[100] overflow-hidden matte-grain"
      style={{
        background: '#000000',
        backgroundImage: isActive
          ? `radial-gradient(ellipse 65% 55% at 50% 50%, rgba(74,144,226,${(glowIntensity / 100) * 0.16}) 0%, transparent 70%)`
          : 'none'
      }}
    >
      {/* Breathing glow */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.1, 1, 1.07, 1], opacity: [0.05, 0.15, 0.07, 0.12, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(74,144,226,1) 0%, transparent 70%)', filter: 'blur(70px)' }}
          />
        )}
      </AnimatePresence>

      {/* Exit button (hidden in strict mode while active) */}
      {!(settings.strictMode && isActive) && !isActive && (
        <button onClick={handleCancel}
          className="absolute top-8 left-6 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#52525B' }}>
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Strict Mode lock indicator */}
      {settings.strictMode && isActive && (
        <div className="absolute top-8 left-6 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,159,10,0.08)', color: 'rgba(255,159,10,0.5)' }}>
          <Lock size={16} />
        </div>
      )}

      {/* Topic label */}
      <AnimatePresence>
        {!isActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute top-10 left-0 right-0 flex justify-center">
            <p className="text-[14px] font-medium tracking-tighter" style={{ color: '#A1A1AA' }}>
              {node?.title || 'Deep Work — imdvichrn'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient HUD */}

      {/* Streak Flame + Timer centerpiece */}
      <motion.div
        animate={{ scale: isActive ? 1.02 : 1, y: isActive ? -16 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center justify-center"
      >
        <div className="mb-4">
          <StreakFlame seconds={seconds} isActive={isActive} />
        </div>

        {/* Progress ring */}
        <div className="relative flex items-center justify-center">
          <svg width="240" height="240" viewBox="0 0 240 240" className="absolute -rotate-90">
            <circle cx="120" cy="120" r="118" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
            <motion.circle
              cx="120" cy="120" r="118" fill="none"
              stroke="rgba(74,144,226,0.65)" strokeWidth="1.5"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'linear' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Ultra-thin timer */}
          <motion.div
            animate={{ scale: isActive && seconds > 0 && seconds % 60 === 0 ? [1, 1.015, 1] : 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="text-[52px] tabular-nums leading-none z-10"
            style={{
              fontWeight: 300,
              letterSpacing: '-0.04em',
              color: isActive ? '#FFFFFF' : '#71717A',
              transition: 'color 0.5s ease-out',
              textShadow: isActive ? `0 0 50px rgba(74,144,226,${glowIntensity / 130})` : 'none'
            }}
          >
            {formatTime(seconds)}
          </motion.div>
        </div>

        {/* Countdown label */}
        {isActive && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.35 }}
            className="mt-3 text-[11px] tabular-nums" style={{ color: '#A1A1AA' }}>
            {formatTime(Math.max(0, pomodoroSeconds - seconds))} remaining
          </motion.p>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div
        animate={{ opacity: isActive ? 0.3 : 1, y: isActive ? 52 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] flex flex-col items-center gap-7 w-full max-w-xs"
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40">
          <LiquidVolumePillar volume={volume} onVolumeChange={setVolume} />
        </div>

        {/* Play + Cancel */}
        <div className="flex items-center gap-6">
          <LiquidButton onClick={handleToggleActive} className="w-14 h-14 rounded-full p-0">
            {isActive ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
          </LiquidButton>

          {!isActive && seconds > 0 && (
            <button onClick={handleCancel}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,69,58,0.08)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.2)' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Long-press to end */}
        <div className="relative w-full px-8">
          <button
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            className="w-full h-10 text-[11px] uppercase tracking-[0.2em] font-medium flex flex-col items-center justify-center gap-2 transition-colors"
            style={{ color: '#3F3F46' }}>
            {isActive ? 'Hold to End' : 'Cancel'}
            {longPressActive && (
              <div className="absolute bottom-0 left-8 right-8 h-[1px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${longPressProgress}%` }}
                  className="h-full" style={{ background: 'var(--color-accent)' }} />
              </div>
            )}
          </button>
        </div>
      </motion.div>

      {isActive && (
        <AmbientHUD
          isActive={isActive}
          isSoundOn={isSoundOn}
          currentSound={currentSound.label}
          volume={volume}
          onToggleSound={() => setIsSoundOn(s => !s)}
          onNextSound={() => {
            const currentIndex = SOUND_PRESETS.findIndex(p => p.id === selectedSound);
            const next = SOUND_PRESETS[(currentIndex + 1) % SOUND_PRESETS.length];
            setSelectedSound(next.id);
            setIsSoundOn(true);
          }}
          onMute={() => {
            setIsSoundOn(false);
            focusAudio.kill().catch(() => {});
          }}
        />
      )}

      {/* Audio suspended toast */}
      <AnimatePresence>
        {isAudioSuspended && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute bottom-32 px-6 py-3 rounded-2xl flex items-center gap-3 z-[110]"
            style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', backdropFilter: 'blur(12px)', color: '#FF453A' }}>
            <AlertCircle size={16} />
            <span className="text-xs font-medium">Audio suspended — tap to resume</span>
            <button onClick={handleResumeAudio}
              className="px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider text-white"
              style={{ background: '#FF453A' }}>
              Resume
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
