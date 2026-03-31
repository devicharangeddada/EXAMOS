import { AppState } from '../types';
import { STORAGE_KEY, DEFAULT_STATE } from '../store';

type ValidationSuccess = { ok: true; state: AppState };
type ValidationFailure = { ok: false; error: string };

export type ValidationResult = ValidationSuccess | ValidationFailure;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateBackupText = (raw: string): ValidationResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Backup is not valid JSON.' };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: 'Backup root must be an object.' };
  }

  const root = parsed as Record<string, unknown>;

  // Core keys presence check
  const requiredKeys: (keyof AppState)[] = ['onboarding', 'nodes', 'sessions', 'settings'];
  for (const key of requiredKeys) {
    if (!(key in root)) {
      return { ok: false, error: `Backup is missing required key: "${key}".` };
    }
  }

  // Nodes shape (very lightweight structural check)
  if (!isObject(root.nodes)) {
    return { ok: false, error: 'Backup "nodes" must be an object map.' };
  }

  const nodes = root.nodes as Record<string, any>;
  for (const [id, node] of Object.entries(nodes)) {
    if (!isObject(node)) {
      return { ok: false, error: `Node "${id}" is not a valid object.` };
    }
    if (typeof node.id !== 'string' || typeof node.title !== 'string') {
      return { ok: false, error: `Node "${id}" is missing a valid "id" or "title".` };
    }
    if (!Array.isArray(node.notes)) {
      return { ok: false, error: `Node "${id}" has invalid "notes" (must be an array).` };
    }
  }

  // Settings shape
  if (!isObject(root.settings)) {
    return { ok: false, error: 'Backup "settings" must be an object.' };
  }

  const settings = root.settings as any;
  const validThemes = ['light', 'dark', 'night', 'auto'];
  const validDensities = ['compact', 'default', 'comfortable'];
  const validSoundTypes = ['white', 'rain', 'brown'];
  const validTimeFormats = ['12h', '24h'];

  if (!validThemes.includes(settings.theme)) {
    return { ok: false, error: 'Backup "settings.theme" is invalid.' };
  }
  if (!validDensities.includes(settings.density)) {
    return { ok: false, error: 'Backup "settings.density" is invalid.' };
  }
  if (!validSoundTypes.includes(settings.soundType)) {
    return { ok: false, error: 'Backup "settings.soundType" is invalid.' };
  }
  if (!validTimeFormats.includes(settings.timeFormat)) {
    return { ok: false, error: 'Backup "settings.timeFormat" is invalid.' };
  }
  if (typeof settings.volume !== 'number' || settings.volume < 0 || settings.volume > 1) {
    return { ok: false, error: 'Backup "settings.volume" must be a number between 0 and 1.' };
  }

  // Build a normalized AppState using the same merge strategy as loadState
  const normalized: AppState = {
    ...DEFAULT_STATE,
    ...(parsed as Partial<AppState>),
    settings: {
      ...DEFAULT_STATE.settings,
      ...(parsed as any).settings,
    },
  };

  return { ok: true, state: normalized };
};

/**
 * Import data from a JSON backup string.
 * When dryRun is true, only validate/normalize and DO NOT touch localStorage.
 */
export const importDataFromText = (
  raw: string,
  options: { dryRun?: boolean } = {}
): ValidationResult => {
  const result = validateBackupText(raw);
  if (!result.ok) return result;

  if (!options.dryRun) {
    try {
      const serialized = JSON.stringify(result.state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      return { ok: false, error: 'Failed to write backup to storage.' };
    }
  }

  return result;
};

