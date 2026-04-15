// js/audio.js — Web Audio API synthesised SFX + BGM
export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx       = null;
    this._bgmActive = false;
    this._bgmTimer  = null;
    this._noteIdx   = 0;
    this.muted      = false;
  }

  // ── Context ─────────────────────────────────────────────────────────────
  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // ── SFX ─────────────────────────────────────────────────────────────────
  playHop() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  playDeath() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    // Descending wail
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.75);
    // Crunchy noise
    this._noise(0.18, 0.25);
  }

  playSplash() {
    if (this.muted) return;
    const ctx = this._getCtx();
    // Low-passed noise = water sound
    const bufLen  = Math.floor(ctx.sampleRate * 0.4);
    const buf     = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const lp     = ctx.createBiquadFilter();
    lp.type      = 'lowpass';
    lp.frequency.setValueAtTime(1200, ctx.currentTime);
    lp.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4);
    const gain   = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  playTrainHorn() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    // Three-note chord horn
    [200, 252, 316].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type  = 'sawtooth';
      osc.frequency.value = freq;
      const t0  = ctx.currentTime + i * 0.015;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.1, t0 + 0.08);
      gain.gain.setValueAtTime(0.1, t0 + 0.45);
      gain.gain.linearRampToValueAtTime(0, t0 + 0.65);
      osc.start(t0);
      osc.stop(t0 + 0.75);
    });
  }

  playCoin() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playEagleScreech() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.65);
  }

  playSiren() {
    if (this.muted) return;
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    
    // Doppler-like wobbling pitch
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.linearRampToValueAtTime(1200, t0 + 0.3);
    osc.frequency.linearRampToValueAtTime(800, t0 + 0.6);
    osc.frequency.linearRampToValueAtTime(1200, t0 + 0.9);
    osc.frequency.linearRampToValueAtTime(800, t0 + 1.2);
    
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.2);
    gain.gain.setValueAtTime(0.15, t0 + 1.0);
    gain.gain.linearRampToValueAtTime(0, t0 + 1.4);
    
    osc.start(t0);
    osc.stop(t0 + 1.45);
  }

  // ── BGM ─────────────────────────────────────────────────────────────────
  startBGM() {
    if (this._bgmActive || this.muted) return;
    this._bgmActive = true;
    this._noteIdx   = 0;
    this._tickBGM();
  }

  stopBGM() {
    this._bgmActive = false;
    clearTimeout(this._bgmTimer);
  }

  _tickBGM() {
    if (!this._bgmActive || this.muted) return;
    const ctx   = this._getCtx();
    // Pentatonic-ish arpeggio (C major scale up & down)
    const scale = [261.6, 329.6, 392, 523.2, 659.3, 523.2, 392, 329.6,
                   293.7, 349.2, 440, 587.3, 440, 349.2, 293.7, 261.6];
    const tempo = 0.145; // seconds per note

    const freq  = scale[this._noteIdx % scale.length];
    this._noteIdx++;

    // Melody
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type  = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.042, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tempo * 0.78);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + tempo * 0.8);

    // Bass every 4 notes
    if (this._noteIdx % 4 === 0) {
      const bass  = ctx.createOscillator();
      const bGain = ctx.createGain();
      bass.connect(bGain);
      bGain.connect(ctx.destination);
      bass.type  = 'triangle';
      bass.frequency.value = freq / 2;
      bGain.gain.setValueAtTime(0.028, ctx.currentTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tempo * 1.5);
      bass.start(ctx.currentTime);
      bass.stop(ctx.currentTime + tempo * 1.6);
    }

    this._bgmTimer = setTimeout(() => this._tickBGM(), tempo * 1000);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  _noise(volume, duration) {
    const ctx    = this._getCtx();
    const bufLen = Math.floor(ctx.sampleRate * duration);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }
}
