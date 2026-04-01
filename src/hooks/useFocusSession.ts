import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppSettings, SoundPresetId, StudySession } from '../types';
import { focusAudio, SOUND_PRESETS } from '../services/FocusAudioContext';

type TickCallback = (seconds: number) => void;

interface UseFocusSessionOptions {
  settings: AppSettings;
  activeNodeId: string | null;
  onTimerComplete: (duration: number) => void;
}

export function useFocusSession({ settings, activeNodeId, onTimerComplete }: UseFocusSessionOptions) {
  const [isActive, setIsActive] = useState(false);
  const [isSilenced, setIsSilenced] = useState(settings.soundMute);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundPresetId>(
    (settings.soundType || 'white') as SoundPresetId
  );
  const [volume, setVolume] = useState(Math.max(0, Math.min(100, settings.volume || 60)));

  const secondsRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const tickSubscribers = useRef(new Set<TickCallback>());

  const targetSeconds = useMemo(() => {
    return Math.max(1, (settings.pomodoroLength || 25) * 60);
  }, [settings.pomodoroLength]);

  const currentSoundLabel = useMemo(() => {
    return SOUND_PRESETS.find((preset) => preset.id === selectedSound)?.label || 'Ambient Focus';
  }, [selectedSound]);

  const publishTick = useCallback(() => {
    const seconds = secondsRef.current;
    tickSubscribers.current.forEach((callback) => callback(seconds));
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (settings.soundMute) {
      setIsSilenced(true);
      focusAudio.kill().catch(() => {});
    }
  }, [settings.soundMute]);

  useEffect(() => {
    setSelectedSound(settings.soundType as SoundPresetId);
  }, [settings.soundType]);

  useEffect(() => {
    focusAudio.setVolume(volume / 100);
  }, [volume]);

  useEffect(() => {
    if (!isActive) {
      clearTimer();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      secondsRef.current += 1;
      publishTick();

      if (secondsRef.current >= targetSeconds) {
        clearTimer();
        setIsActive(false);
        onTimerComplete(secondsRef.current);
      }
    }, 1000);

    return () => clearTimer();
  }, [isActive, targetSeconds, onTimerComplete, clearTimer, publishTick]);

  const getElapsedSeconds = useCallback(() => secondsRef.current, []);
  const getProgress = useCallback(() => Math.min(1, secondsRef.current / targetSeconds), [targetSeconds]);

  const registerTick = useCallback((callback: TickCallback) => {
    tickSubscribers.current.add(callback);
    callback(secondsRef.current);
    return () => {
      tickSubscribers.current.delete(callback);
    };
  }, []);

  const resumeAudio = useCallback(async () => {
    if (settings.soundMute || isSilenced) {
      return;
    }

    await focusAudio.initialize().catch(() => {});
    await focusAudio.resume().catch(() => {
      setIsAudioSuspended(true);
    });

    if (!focusAudio.isSuspended()) {
      await focusAudio.play(selectedSound).catch(() => {
        setIsAudioSuspended(true);
      });
      setIsAudioSuspended(false);
    }
  }, [isSilenced, selectedSound, settings.soundMute]);

  const start = useCallback(async () => {
    await resumeAudio();
    setIsActive(true);
  }, [resumeAudio]);

  const pause = useCallback(() => {
    setIsActive(false);
    focusAudio.stop();
  }, []);

  const end = useCallback(() => {
    setIsActive(false);
    clearTimer();
  }, [clearTimer]);

  const toggleSilence = useCallback(async () => {
    if (isSilenced) {
      setIsSilenced(false);
      await resumeAudio();
      return;
    }

    setIsSilenced(true);
    await focusAudio.silence().catch(() => {});
  }, [isSilenced, resumeAudio]);

  const cycleSound = useCallback(async () => {
    const currentIndex = SOUND_PRESETS.findIndex((preset) => preset.id === selectedSound);
    const next = SOUND_PRESETS[(currentIndex + 1) % SOUND_PRESETS.length];
    setSelectedSound(next.id);
    setIsSilenced(false);
    if (isActive) {
      await resumeAudio();
    }
  }, [isActive, resumeAudio, selectedSound]);

  const setVolumeSafe = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setVolume(clamped);
  }, []);

  return {
    isActive,
    isSilenced,
    isAudioSuspended,
    selectedSound,
    volume,
    currentSoundLabel,
    start,
    pause,
    end,
    toggleSilence,
    cycleSound,
    setVolume: setVolumeSafe,
    registerTick,
    getElapsedSeconds,
    getProgress,
  };
}
