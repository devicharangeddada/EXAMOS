/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FocusAudioContext Manager
 * Handles high-fidelity audio transitions, logarithmic volume curves, 
 * and browser-compliant initialization.
 */

export type SoundPresetId = 'white' | 'rain' | 'brown' | 'cafe';

interface SoundPreset {
  id: SoundPresetId;
  url: string;
  label: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'white', label: 'White Noise', url: 'https://raw.githubusercontent.com/rafaelrinaldi/pure-noise/master/sounds/white.mp3' },
  { id: 'rain', label: 'Rain', url: 'https://raw.githubusercontent.com/rafaelrinaldi/pure-noise/master/sounds/pink.mp3' },
  { id: 'brown', label: 'Brown Noise', url: 'https://raw.githubusercontent.com/rafaelrinaldi/pure-noise/master/sounds/brown.mp3' },
  { id: 'cafe', label: 'Ambient Cafe', url: 'https://raw.githubusercontent.com/rafaelrinaldi/pure-noise/master/sounds/white.mp3' },
];

class AudioController {
  private context: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache: Map<SoundPresetId, AudioBuffer> = new Map();
  private currentPresetId: SoundPresetId | null = null;
  private volume: number = 0.5; // 0 to 1

  constructor() {
    // Load persisted settings
    const savedVolume = localStorage.getItem('focus_user_volume');
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
    const savedPreset = localStorage.getItem('focus_current_preset') as SoundPresetId;
    if (savedPreset && SOUND_PRESETS.find(p => p.id === savedPreset)) {
      this.currentPresetId = savedPreset;
    }
  }

  /**
   * Initialize or resume the AudioContext.
   * Must be called within a user-triggered event.
   */
  public async initialize(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.updateMasterGain();
      
      // Preload top sounds
      this.preload(['white', 'rain', 'brown']);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private updateMasterGain() {
    if (!this.masterGain || !this.context) return;
    const gainValue = Math.pow(this.volume, 2);
    this.masterGain.gain.setTargetAtTime(gainValue, this.context.currentTime, 0.1);
  }

  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    localStorage.setItem('focus_user_volume', this.volume.toString());
    this.updateMasterGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentPreset(): SoundPresetId | null {
    return this.currentPresetId;
  }

  private async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.context) throw new Error('AudioContext not initialized');
    
    // Modern browsers return a promise, but we use a wrapper for maximum compatibility
    return new Promise((resolve, reject) => {
      try {
        this.context!.decodeAudioData(
          arrayBuffer,
          (buffer) => resolve(buffer),
          (error) => {
            console.error('decodeAudioData error:', error);
            reject(new Error('Unable to decode audio data'));
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  private async preload(ids: SoundPresetId[]) {
    for (const id of ids) {
      const preset = SOUND_PRESETS.find(p => p.id === id);
      if (preset && !this.bufferCache.has(id)) {
        try {
          const response = await fetch(preset.url, { referrerPolicy: "no-referrer" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) throw new Error('Empty buffer');
          const audioBuffer = await this.decodeAudio(arrayBuffer);
          this.bufferCache.set(id, audioBuffer);
        } catch (e) {
          console.error(`Failed to preload sound: ${id}`, e.message);
        }
      }
    }
  }

  public async play(id: SoundPresetId) {
    if (!this.context) await this.initialize();
    if (this.context!.state === 'suspended') await this.context!.resume();

    if (this.currentPresetId === id && this.currentSource) return;

    const preset = SOUND_PRESETS.find(p => p.id === id);
    if (!preset) return;

    // 1. Crossfade out current sound
    const oldGain = this.currentGain;
    const oldSource = this.currentSource;
    if (oldGain) {
      const fadeTime = 1.5;
      const currentTime = this.context!.currentTime;
      oldGain.gain.cancelScheduledValues(currentTime);
      oldGain.gain.setValueAtTime(oldGain.gain.value, currentTime);
      oldGain.gain.exponentialRampToValueAtTime(0.001, currentTime + fadeTime);
      setTimeout(() => {
        try {
          oldSource?.stop();
          oldSource?.disconnect();
          oldGain.disconnect();
        } catch (e) {
          // Ignore errors if already stopped/disconnected
        }
      }, fadeTime * 1000 + 100);
    }

    // 2. Load and play new sound
    let buffer = this.bufferCache.get(id);
    if (!buffer) {
      try {
        const response = await fetch(preset.url, { referrerPolicy: "no-referrer" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) throw new Error('Empty buffer');
        buffer = await this.decodeAudio(arrayBuffer);
        this.bufferCache.set(id, buffer);
      } catch (e) {
        console.error(`Failed to play sound: ${id}`, e);
        return;
      }
    }

    const newSource = this.context!.createBufferSource();
    newSource.buffer = buffer;
    newSource.loop = true;

    const newGain = this.context!.createGain();
    const currentTime = this.context!.currentTime;
    newGain.gain.setValueAtTime(0.001, currentTime);
    
    newSource.connect(newGain);
    newGain.connect(this.masterGain!);

    // 3. Crossfade in new sound
    const fadeInTime = 2.0;
    newSource.start(0);
    newGain.gain.exponentialRampToValueAtTime(1.0, currentTime + fadeInTime);

    this.currentSource = newSource;
    this.currentGain = newGain;
    this.currentPresetId = id;
    localStorage.setItem('focus_current_preset', id);
  }

  public stop() {
    if (!this.currentGain || !this.context) return;

    const fadeOutTime = 1.5;
    const gain = this.currentGain;
    const source = this.currentSource;

    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + fadeOutTime);
    
    setTimeout(() => {
      source?.stop();
      source?.disconnect();
      gain.disconnect();
    }, fadeOutTime * 1000 + 100);

    this.currentSource = null;
    this.currentGain = null;
    this.currentPresetId = null;
  }

  public isSuspended(): boolean {
    return this.context?.state === 'suspended';
  }
}

export const focusAudio = new AudioController();
