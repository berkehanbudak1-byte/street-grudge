/**
 * Street Grudge — Procedural Web Audio Engine
 * Zero external audio assets required; synthesizes all arcade SFX and city ambience.
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
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

    punchSwing() { this.noise(0.07, 0.08, 1600); this.tone(260, 110, 0.07, 'triangle', 0.08); }
    hitLight()   { this.noise(0.09, 0.16, 1100); this.tone(180, 55, 0.09, 'square', 0.14); }
    hitHeavy()   { this.noise(0.14, 0.22, 650);  this.tone(140, 36, 0.16, 'sawtooth', 0.18); }
    block()      { this.tone(680, 920, 0.07, 'square', 0.10); this.tone(320, 260, 0.06, 'triangle', 0.08); }
    dash()       { this.noise(0.10, 0.09, 2200); this.tone(420, 180, 0.10, 'sine', 0.07); }
    special()    {
      this.tone(220, 880, 0.18, 'sawtooth', 0.15);
      this.tone(440, 120, 0.28, 'square', 0.14, 0.10);
      this.noise(0.22, 0.18, 950, 0.08);
    }
    shockwave()  {
      this.tone(130, 32, 0.34, 'sawtooth', 0.20);
      this.noise(0.28, 0.20, 420);
    }
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
