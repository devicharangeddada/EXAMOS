export type HapticIntensity = 'light' | 'heavy';

/**
 * Simulated haptics hook.
 * In a web context we can't trigger real vibrations everywhere,
 * so this is a semantic layer that components can call into.
 */
export const useHaptics = () => {
  const pulse = (_intensity: HapticIntensity) => {
    // In the future this could trigger subtle animations or the Vibration API.
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(_intensity === 'heavy' ? 25 : 10);
    }
  };

  return { pulse };
};

