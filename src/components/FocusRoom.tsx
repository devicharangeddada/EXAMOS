import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudyNode, AppSettings, StudySession } from '../types';
import { Play, Pause, Volume2, VolumeX, Flame, Wind, Droplets, Coffee, Radio, ChevronLeft, X, AlertCircle } from 'lucide-react';
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
}

export default function FocusRoom({ activeNodeId, nodes, settings, onComplete, onCancel }: FocusRoomProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(settings.autoPlay);
  const [selectedSound, setSelectedSound] = useState<SoundPresetId>(focusAudio.getCurrentPreset() || 'white');
  const [volume, setVolume] = useState(focusAudio.getVolume() * 100);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [completed, setCompleted] = useState(true);
  const [longPressActive, setLongPressActive] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  
  const longPressTimer = useRef<any>(null);
  const node = activeNodeId ? nodes[activeNodeId] : null;
  const { pulse } = useHaptics();

  // Logic #2: Radial Glow Intensity (Starts at 15%, +1% every 5 mins)
  const glowIntensity = useMemo(() => 15 + Math.floor(seconds / 300), [seconds]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Audio Manager
  useEffect(() => {
    if (isActive && isSoundOn) {
      focusAudio.play(selectedSound).catch(() => setIsAudioSuspended(true));
    } else {
      focusAudio.stop();
    }
  }, [isActive, isSoundOn, selectedSound]);

  useEffect(() => {
    focusAudio.setVolume(volume / 100);
  }, [volume]);

  const handleToggleActive = async () => {
    if (!isActive) {
      // User Interaction Gatekeeper
      await focusAudio.initialize();
      setIsAudioSuspended(focusAudio.isSuspended());
    }
    setIsActive(!isActive);
  };

  const handleResumeAudio = async () => {
    await focusAudio.initialize();
    setIsAudioSuspended(focusAudio.isSuspended());
    if (isActive && isSoundOn) {
      focusAudio.play(selectedSound);
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
    let start = Date.now();
    longPressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setLongPressProgress(progress);
      if (progress >= 100) {
        clearInterval(longPressTimer.current);
        handleEnd();
      }
    }, 16);
  };

  const handleLongPressEnd = () => {
    setLongPressActive(false);
    setLongPressProgress(0);
    if (longPressTimer.current) clearInterval(longPressTimer.current);
  };

  const handleEnd = () => {
    setIsActive(false);
    setShowSummary(true);
  };

  const handleFinish = () => {
    if (!activeNodeId) return;
    
    // Update node metrics for Weakness Detection Algorithm
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    
    onComplete({
      id: Math.random().toString(36).substring(7),
      nodeId: activeNodeId,
      startTime: Date.now() - seconds * 1000,
      duration: seconds,
      completed,
      difficulty
    });
  };

  // Progress Ring Calculations
  const radius = 118; // 240px diameter - 3px stroke / 2 (approx)
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(seconds / (25 * 60), 1); // Default 25 min session
  const strokeDashoffset = circumference - progress * circumference;

  if (showSummary) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-large z-[100] matte-grain bg-base-dark">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-large max-w-md w-full space-y-medium border border-border-color backdrop-blur-xl"
        >
          <div className="text-center space-y-nano">
            <h2 className="text-[14px] font-medium text-secondary">How was your focus?</h2>
            <p className="text-[44px] font-medium tracking-tighter text-accent tabular-nums leading-none">{formatTime(seconds)}</p>
          </div>

          <div className="space-y-medium">
            <div className="flex justify-center gap-medium">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button 
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "w-12 h-12 rounded-2xl border border-border-color flex items-center justify-center transition-all press-scale", 
                    difficulty === d 
                      ? "bg-success/10 border-success/40 text-success shadow-[0_0_20px_rgba(52,199,89,0.2)]" 
                      : "bg-action-dark/50 text-tertiary"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold">{d[0]}</span>
                </button>
              ))}
            </div>
            
            <div className="space-y-small">
              <p className="caption-sm text-center text-tertiary">Did you complete your goal?</p>
              <div className="flex gap-small">
                <button 
                  onClick={() => setCompleted(true)}
                  className={cn(
                    "flex-1 h-10 rounded-xl border border-border-color transition-all press-scale text-xs font-medium", 
                    completed ? "bg-success/20 border-success/40 text-success" : "bg-action-dark/50 text-tertiary"
                  )}
                >
                  Goal Met
                </button>
                <button 
                  onClick={() => setCompleted(false)}
                  className={cn(
                    "flex-1 h-10 rounded-xl border border-border-color transition-all press-scale text-xs font-medium", 
                    !completed ? "bg-error/20 border-error/40 text-error" : "bg-action-dark/50 text-tertiary"
                  )}
                >
                  Incomplete
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-small">
            <button 
              onClick={handleFinish}
              className="w-full bg-accent text-white h-12 rounded-xl font-medium shadow-lg shadow-accent/20 press-scale"
            >
              Log Session
            </button>
            <button 
              onClick={onCancel}
              className="w-full h-10 text-[11px] uppercase tracking-[0.2em] font-medium text-tertiary hover:text-primary transition-colors"
            >
              Don't Log Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col items-center justify-center z-[100] overflow-hidden focus-breathing-bg matte-grain",
    )}>
      {/* Breathing Gradient Focal Point Animation */}
      <motion.div
        animate={{
          "--focal-x": ["40%", "60%", "50%", "40%"],
          "--focal-y": ["40%", "45%", "60%", "40%"],
        } as any}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* UI Fade Layer */}
      <AnimatePresence>
        {!isActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-8 left-0 right-0 flex justify-center"
          >
            <p className="text-[14px] font-medium text-primary tracking-wide">
              {node?.title || 'Deep Work Session'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient HUD */}
      <AnimatePresence>
        {isActive && isSoundOn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl text-xs text-white flex items-center gap-3"
          >
            <Radio size={14} className="opacity-70" />
            <span className="font-medium">
              {SOUND_PRESETS.find(p => p.id === selectedSound)?.label || 'Ambient'}
            </span>
            <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/70"
                style={{ width: `${volume}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centerpiece (Timer & Ring) */}
      <motion.div 
        animate={{ 
          scale: isActive ? 1.03 : 1,
          y: isActive ? -20 : 0
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center"
      >
        {/* Radial Glow */}
        <motion.div 
          animate={{ 
            opacity: isActive ? glowIntensity / 100 : 0.05,
            scale: isActive ? [1, 1.05, 1] : 1
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[300px] h-[300px] rounded-full bg-accent/20 blur-[80px] pointer-events-none"
        />

        {/* Progress Ring */}
        <svg width="240" height="240" viewBox="0 0 240 240" className="absolute -rotate-90">
          <circle
            cx="120"
            cy="120"
            r="118"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="3"
            className="opacity-20"
          />
          <motion.circle
            cx="120"
            cy="120"
            r="118"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Timer Text */}
        <motion.div 
          animate={{ 
            scale: (isActive && seconds > 0 && seconds % 60 === 0) ? [1, 1.01, 1] : 1
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="text-[44px] font-medium tracking-tighter tabular-nums text-primary z-10"
        >
          {formatTime(seconds)}
        </motion.div>
      </motion.div>

      {/* Controls & Sound Selector */}
      <AnimatePresence>
        <motion.div 
          animate={{ 
            opacity: isActive ? 0.4 : 1,
            y: isActive ? 40 : 0
          }}
          className="absolute bottom-12 flex flex-col items-center gap-8 w-full max-w-xs"
        >
          {/* Sound Selector */}
          {!isActive && (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex gap-nano bg-action-dark/20 p-1 rounded-2xl border border-border-color backdrop-blur-md">
                {SOUND_PRESETS.map(s => {
                  const Icon = (s.id === 'white' ? Radio : s.id === 'rain' ? Droplets : s.id === 'brown' ? Wind : Coffee);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSound(s.id)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all press-scale",
                        selectedSound === s.id ? "bg-accent text-white" : "text-tertiary hover:text-secondary"
                      )}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>

              {/* Volume Slider - Vertical Liquid Pillar */}
              <div className="flex items-center justify-center gap-4 w-full px-4">
                <VolumeX size={14} className="text-tertiary" />
                <div
                  className="h-32 w-6 rounded-full bg-action-dark/40 relative overflow-hidden cursor-pointer"
                  onMouseDown={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const updateFromClientY = (clientY: number) => {
                      const ratio = 1 - (clientY - rect.top) / rect.height;
                      const clamped = Math.max(0, Math.min(1, ratio));
                      const nextVolume = Math.round(clamped * 100);
                      const prevVolume = volume;
                      if ((nextVolume === 0 || nextVolume === 100) && nextVolume !== prevVolume) {
                        pulse('heavy');
                      }
                      setVolume(nextVolume);
                    };
                    updateFromClientY(e.clientY);
                    const move = (moveEvent: MouseEvent) => updateFromClientY(moveEvent.clientY);
                    const up = () => {
                      window.removeEventListener('mousemove', move);
                      window.removeEventListener('mouseup', up);
                    };
                    window.addEventListener('mousemove', move);
                    window.addEventListener('mouseup', up);
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{ height: `${volume}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      background: 'linear-gradient(180deg, #1D4ED8, #5B21B6)'
                    }}
                  />
                </div>
                <Volume2 size={14} className="text-tertiary" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-6">
            <LiquidButton
              onClick={handleToggleActive}
              className="w-14 h-14 rounded-full p-0"
            >
              {isActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </LiquidButton>

            {!isActive && seconds > 0 ? (
              <button 
                onClick={onCancel}
                className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center transition-all press-scale border border-error/20"
                title="Discard Session"
              >
                <X size={20} />
              </button>
            ) : (
              <button 
                onClick={() => setIsSoundOn(!isSoundOn)}
                className={cn(
                  "w-10 h-10 rounded-full bg-action-dark/20 flex items-center justify-center transition-all press-scale",
                  isSoundOn ? "text-primary" : "text-tertiary"
                )}
              >
                {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
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
              className="w-full h-10 text-[11px] uppercase tracking-[0.2em] font-medium text-tertiary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2"
            >
              {isActive ? 'Hold to End' : 'Cancel'}
              
              {longPressActive && (
                <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-border-color rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${longPressProgress}%` }}
                    className="h-full bg-accent"
                  />
                </div>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Exit Button (Only when not active) */}
      {!isActive && (
        <button 
          onClick={onCancel}
          className="absolute top-8 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-action-dark/20 text-tertiary hover:text-primary transition-colors press-scale"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Audio Suspended Toast */}
      <AnimatePresence>
        {isAudioSuspended && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-32 px-6 py-3 bg-error/20 border border-error/40 backdrop-blur-xl rounded-2xl flex items-center gap-3 text-error z-[110]"
          >
            <AlertCircle size={18} />
            <span className="text-xs font-medium">Audio suspended by browser</span>
            <button 
              onClick={handleResumeAudio}
              className="px-3 py-1 bg-error text-white rounded-lg text-[10px] font-bold uppercase tracking-wider"
            >
              Resume
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
