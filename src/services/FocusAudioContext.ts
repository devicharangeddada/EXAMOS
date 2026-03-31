/**
 * FocusAudioContext Manager
 * Generates ambient noise programmatically using Web Audio API.
 * No network fetches required — zero CORS issues, instant playback.
 */

export type SoundPresetId = 'white' | 'rain' | 'brown' | 'cafe';

interface SoundPreset {
  id: SoundPresetId;
  label: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'white', label: 'Ethereal White Noise' },
  { id: 'rain',  label: 'Deep Rain' },
  { id: 'brown', label: 'Forest Brown Noise' },
  { id: 'cafe',  label: 'Café Focus' },
];

/** Generate a buffer of the requested noise type */
function generateNoiseBuffer(context: AudioContext, type: SoundPresetId): AudioBuffer {
  const sampleRate = context.sampleRate;
  // 3-second loopable buffer
  const frameCount = sampleRate * 3;
  const buffer = context.createBuffer(2, frameCount, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const output = buffer.getChannelData(channel);

    if (type === 'white' || type === 'cafe') {
      // White noise: flat random spectrum
      for (let i = 0; i < frameCount; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'brown') {
      // Brown noise: integrated white noise (low-frequency rumble)
      let lastOut = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // normalize
      }
    } else if (type === 'rain') {
      // Rain: white noise with low-pass resonance and drip spikes
      let lastOut = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        // Simple IIR low-pass
        output[i] = lastOut + 0.1 * (white - lastOut);
        lastOut = output[i];
        // Occasional drip transient
        if (Math.random() < 0.0004) {
          output[i] += (Math.random() - 0.5) * 0.6;
        }
        output[i] *= 2.5;
      }
    }
  }

  return buffer;
}

/** Build a post-processing filter chain for realism */
function buildFilterChain(context: AudioContext, type: SoundPresetId): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  if (type === 'white') {
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.3;
  } else if (type === 'brown') {
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.7;
  } else if (type === 'rain') {
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.5;
  } else {
    // cafe: slight bandpass warmth
    filter.type = 'peaking';
    filter.frequency.value = 800;
    filter.gain.value = 3;
    filter.Q.value = 0.5;
  }
  return filter;
}

class AudioController {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private currentFilter: BiquadFilterNode | null = null;
  private currentPresetId: SoundPresetId | null = null;
  private volume: number = 0.5;
  private bufferCache: Map<SoundPresetId, AudioBuffer> = new Map();

  constructor() {
    const savedVolume = localStorage.getItem('focus_user_volume');
    if (savedVolume !== null) this.volume = parseFloat(savedVolume);
    const savedPreset = localStorage.getItem('focus_current_preset') as SoundPresetId;
    if (savedPreset && SOUND_PRESETS.find(p => p.id === savedPreset)) {
      this.currentPresetId = savedPreset;
    }
  }

  public async initialize(): Promise<void> {
    if (!this.context) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      this.context = new Ctx();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this._applyMasterGain();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private _applyMasterGain() {
    if (!this.masterGain || !this.context) return;
    // Logarithmic volume curve for natural feel
    const gainValue = Math.pow(this.volume, 2);
    this.masterGain.gain.setTargetAtTime(gainValue, this.context.currentTime, 0.1);
  }

  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    localStorage.setItem('focus_user_volume', this.volume.toString());
    this._applyMasterGain();
  }

  public getVolume(): number { return this.volume; }
  public getCurrentPreset(): SoundPresetId | null { return this.currentPresetId; }
  public isSuspended(): boolean { return this.context?.state === 'suspended'; }

  private _getBuffer(id: SoundPresetId): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized');
    if (!this.bufferCache.has(id)) {
      this.bufferCache.set(id, generateNoiseBuffer(this.context, id));
    }
    return this.bufferCache.get(id)!;
  }

  private _stopCurrent(fadeTime = 1.2) {
    if (!this.currentGain || !this.context) return;
    const gain = this.currentGain;
    const source = this.currentSource;
    const t = this.context.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);

    if (fadeTime <= 0) {
      try { source?.stop(); source?.disconnect(); gain.disconnect(); } catch {}
    } else {
      gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeTime);
      setTimeout(() => {
        try { source?.stop(); source?.disconnect(); gain.disconnect(); } catch {}
      }, fadeTime * 1000 + 100);
    }

    this.currentSource = null;
    this.currentGain = null;
    this.currentPresetId = null;
  }

  public async kill(): Promise<void> {
    this._stopCurrent(0);
    if (this.context) {
      try {
        await this.context.close();
      } catch {}
    }
    this.context = null;
    this.masterGain = null;
    this.currentFilter = null;
    this.currentGain = null;
    this.currentSource = null;
    this.currentPresetId = null;
    this.bufferCache.clear();
  }

  public async play(id: SoundPresetId): Promise<void> {
    await this.initialize();
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }

    // Already playing this preset
    if (this.currentPresetId === id && this.currentSource) return;

    // Fade out old
    this._stopCurrent(1.2);

    const buffer = this._getBuffer(id);
    const filter = buildFilterChain(this.context!, id);

    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.context!.createGain();
    const t = this.context!.currentTime;
    gain.gain.setValueAtTime(0.0001, t);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    const fadeInTime = 1.8;
    source.start(0);
    gain.gain.exponentialRampToValueAtTime(1.0, t + fadeInTime);

    this.currentSource = source;
    this.currentGain = gain;
    this.currentFilter = filter;
    this.currentPresetId = id;
    localStorage.setItem('focus_current_preset', id);
  }

  public stop() {
    this._stopCurrent(1.5);
  }
}

export const focusAudio = new AudioController();
