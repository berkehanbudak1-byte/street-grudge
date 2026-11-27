/**
 * Street Grudge v3 — Procedural Web Audio Engine + Adaptive Chiptune Arcade Music!
 * Music dynamically shifts between:
 *  - Exploration funky city groove
 *  - High-energy Street Combat synth drums & bass
 *  - Slow chill "elevator jazz" when your Grudge drops below 30%!
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.musicEnabled = true;
      this.musicStep = 0;
      this.musicAccum = 0;
      this.musicMode = 'explore'; // 'explore' | 'combat' | 'chill'
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    tone(freq, endFreq, duration, type = 'square', volume = 0.12, delay = 0) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    noise(duration, volume = 0.14, filterFreq = 900, delay = 0) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }

    /* Adaptive 16-step Chiptune Sequencer */
    updateMusic(dt, mode) {
      if (this.muted || !this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      this.musicMode = mode;
      const stepTime = mode === 'combat' ? 0.125 : (mode === 'chill' ? 0.25 : 0.165);
      this.musicAccum += dt;
      if (this.musicAccum < stepTime) return;
      this.musicAccum -= stepTime;

      const s = this.musicStep % 16;
      this.musicStep++;

      if (mode === 'combat') {
        // High-octane Street Fighter-inspired bass + lead + kick/snare
        const bass = [110, 110, 130.8, 110, 146.8, 110, 164.8, 146.8, 98, 98, 110, 130.8, 146.8, 130.8, 123.5, 98];
        const lead = [440, 0, 523.3, 0, 587.3, 523.3, 440, 0, 392, 0, 440, 523.3, 659.3, 0, 587.3, 523.3];
        this.tone(bass[s], bass[s] * 0.96, 0.11, 'sawtooth', 0.045);
        if (lead[s] > 0) this.tone(lead[s], lead[s], 0.10, 'square', 0.032);
        if (s % 4 === 0) this.tone(130, 42, 0.08, 'sine', 0.08); // kick
        if (s % 4 === 2) this.noise(0.06, 0.055, 1900); // snare
      } else if (mode === 'chill') {
        // Hilariously calm elevator-jazz groove when calming down (<30% Grudge!)
        const chords = [261.6, 329.6, 392, 493.9, 293.7, 349.2, 440, 523.3];
        if (s % 2 === 0) {
          const n = chords[(s / 2) % chords.length];
          this.tone(n, n, 0.22, 'triangle', 0.036);
        }
        if (s % 4 === 0) this.tone(130.8, 128, 0.18, 'sine', 0.04);
      } else {
        // Funky urban exploration beat
        const bass = [130.8, 0, 130.8, 155.6, 174.6, 0, 155.6, 130.8, 116.5, 0, 116.5, 130.8, 146.8, 0, 130.8, 116.5];
        const pluck = [0, 392, 0, 0, 466.2, 0, 392, 0, 0, 349.2, 0, 392, 0, 523.3, 0, 466.2];
        if (bass[s] > 0) this.tone(bass[s], bass[s] * 0.98, 0.13, 'triangle', 0.048);
        if (pluck[s] > 0) this.tone(pluck[s], pluck[s], 0.09, 'square', 0.022);
        if (s % 4 === 0) this.tone(110, 45, 0.07, 'sine', 0.055);
        if (s % 8 === 4) this.noise(0.045, 0.035, 2400);
      }
    }

    punchSwing() { this.noise(0.07, 0.08, 1600); this.tone(260, 110, 0.07, 'triangle', 0.08); }
    hitLight()   { this.noise(0.09, 0.16, 1100); this.tone(180, 55, 0.09, 'square', 0.14); }
    hitHeavy()   { this.noise(0.14, 0.22, 650);  this.tone(140, 36, 0.16, 'sawtooth', 0.18); }
    block()      { this.tone(680, 920, 0.07, 'square', 0.10); this.tone(320, 260, 0.06, 'triangle', 0.08); }
    parry()      {
      this.tone(1046, 1568, 0.12, 'triangle', 0.16);
      this.tone(1568, 2093, 0.18, 'sine', 0.14, 0.05);
      this.noise(0.08, 0.10, 3200);
    }
    dash()       { this.noise(0.10, 0.09, 2200); this.tone(420, 180, 0.10, 'sine', 0.07); }
    throwItem()  { this.noise(0.09, 0.10, 2000); this.tone(520, 220, 0.11, 'triangle', 0.10); }
    bonk()       { this.tone(420, 180, 0.14, 'sine', 0.18); this.tone(260, 140, 0.10, 'triangle', 0.14, 0.04); }
    special()    {
      this.tone(220, 880, 0.18, 'sawtooth', 0.15);
      this.tone(440, 120, 0.28, 'square', 0.14, 0.10);
      this.noise(0.22, 0.18, 950, 0.08);
    }
    ultraSuper() {
      this.tone(180, 1200, 0.26, 'sawtooth', 0.18);
      this.tone(523, 1046, 0.22, 'square', 0.16, 0.12);
      this.tone(1046, 160, 0.42, 'sawtooth', 0.18, 0.24);
      this.noise(0.35, 0.22, 700, 0.16);
    }
    shockwave()  { this.tone(130, 32, 0.34, 'sawtooth', 0.20); this.noise(0.28, 0.20, 420); }
    whistle()    { this.tone(2400, 2650, 0.14, 'sine', 0.10); this.tone(2650, 2350, 0.16, 'sine', 0.10, 0.15); }
    shout()      { this.tone(360, 540, 0.11, 'sawtooth', 0.10); this.tone(540, 310, 0.14, 'square', 0.09, 0.10); }
    hydrant()    { this.tone(280, 90, 0.12, 'square', 0.14); this.noise(0.35, 0.15, 2400, 0.05); }
    trashCan()   { this.tone(520, 240, 0.10, 'square', 0.12); this.noise(0.14, 0.12, 1400); }
    carHorn()    { this.tone(392, 392, 0.18, 'sawtooth', 0.08); this.tone(493.8, 493.8, 0.18, 'sawtooth', 0.07); }
    pickup()     { this.tone(523, 659, 0.09, 'triangle', 0.12); this.tone(659, 1046, 0.14, 'triangle', 0.12, 0.08); }
    subway()     {
      this.noise(0.42, 0.15, 380);
      this.tone(200, 62, 0.38, 'sawtooth', 0.10);
      this.tone(520, 660, 0.10, 'sine', 0.09, 0.32);
    }
    challenger() {
      this.tone(330, 330, 0.10, 'square', 0.13, 0);
      this.tone(440, 440, 0.10, 'square', 0.13, 0.10);
      this.tone(659, 659, 0.22, 'sawtooth', 0.15, 0.20);
    }
    koFanfare() {
      this.hitHeavy();
      this.tone(523, 523, 0.12, 'square', 0.14, 0.08);
      this.tone(659, 659, 0.12, 'square', 0.14, 0.18);
      this.tone(784, 784, 0.16, 'square', 0.15, 0.28);
      this.tone(1046, 980, 0.32, 'sawtooth', 0.15, 0.42);
    }
    forgotTrombone() {
      this.tone(311, 293, 0.24, 'sawtooth', 0.12, 0.0);
      this.tone(293, 277, 0.24, 'sawtooth', 0.12, 0.26);
      this.tone(277, 261, 0.24, 'sawtooth', 0.12, 0.52);
      this.tone(261, 238, 0.65, 'sawtooth', 0.13, 0.78);
    }
    distantSiren(intensity = 0.04) {
      this.tone(620, 840, 0.32, 'sine', intensity, 0);
      this.tone(840, 620, 0.32, 'sine', intensity, 0.32);
    }
  }

  SG.SoundEngine = SoundEngine;
})(window.StreetGrudge);
