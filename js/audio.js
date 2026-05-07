// Procedural engine sound synthesizer with per-engine character.
//
// Previous version: every car was a stack of sawtooth oscillators with
// the same noise + filter chain — they all sounded buzzy and similar.
//
// This version uses a CUSTOM PeriodicWave per engine type, plus engine-
// specific formant filters (peak-EQ at characteristic exhaust resonances)
// and a per-engine noise/grit filter. The result is that each engine has
// its own recognisable "voice":
//
//   • V8 cross-plane (Mustang, M3 V8, AMG) — deep American burble with
//     strong odd harmonics and a 200 Hz formant.
//   • V8 flat-plane (Ferrari, race) — bright "shrieking" tone with even
//     harmonics dominating; formants in 700/2.4k Hz range.
//   • V12 NA (Lambo Countach) — dense harmonic stack, screaming top end
//     with formants at 600/1.6k/3.2k Hz.
//   • Flat-6 turbo (Porsche 911) — metallic, with strong 3rd & 9th
//     harmonics; formants at 850/1900 Hz; turbo whistle layer.
//   • I4 NA (BMW E30 S14) — small-bore high-rev rasp with 2nd-harmonic
//     emphasis and bright formant at 1.2 kHz.
//   • W16 (Bugatti) — low complex bass with broad mid-range hum.
//   • EV — pure inverter whine, no combustion.
//
// We also halved the master volume and added a soft-clipping curve so
// the synth no longer feels harsh.

export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.profile = null;

    this.rpm = 0;
    this.targetRpm = 0;
    this.throttle = 0;
    this.brake = 0;
    this.boost = 0;
    this.targetBoost = 0;
    this.lastUpdate = 0;
    this._running = false;
    this._nodes = null;

    this._waveCache = {};
  }

  async init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (e) {}
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;

    // Soft-clip waveshaper to keep peaks pleasant.
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 2048) * 2 - 1;
      curve[i] = Math.tanh(x * 1.3);
    }
    shaper.curve = curve;
    shaper.oversample = "2x";

    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;

    // Subtle high-shelf cut to tame harsh treble.
    const tilt = this.ctx.createBiquadFilter();
    tilt.type = "highshelf";
    tilt.frequency.value = 4500;
    tilt.gain.value = -3.0;

    this.master.connect(tilt).connect(shaper).connect(limiter).connect(this.ctx.destination);

    this._whiteNoise = this._makeNoiseBuffer(2.0, "white");
    this._pinkNoise  = this._makeNoiseBuffer(2.0, "pink");
  }

  _makeNoiseBuffer(seconds, kind) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === "pink") {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i=0;i<len;i++) {
        const w = Math.random()*2-1;
        b0 = 0.99886*b0 + w*0.0555179;
        b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520;
        b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522;
        b5 = -0.7616*b5 - w*0.0168980;
        d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
        b6 = w*0.115926;
      }
    } else {
      for (let i=0;i<len;i++) d[i] = Math.random()*2-1;
    }
    return buf;
  }

  // Build a custom PeriodicWave for a specific engine character. The arrays
  // describe the harmonic content (cosine and sine coefficients).
  _getEngineWave(profile) {
    const key = profile.character || profile.type || "default";
    if (this._waveCache[key]) return this._waveCache[key];

    const N = 32;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    // Default — soft sawtooth-like spectrum
    for (let n = 1; n < N; n++) {
      imag[n] = 1 / n;
    }

    const ch = profile.character;
    if (ch === "v8-cross") {
      // American V8 burble: strong fundamental, 2nd, and 4th, with
      // characteristic 5th-harmonic dip and 8th lift.
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 1.00; imag[2] = 0.55; imag[3] = 0.20; imag[4] = 0.55;
      imag[5] = 0.10; imag[6] = 0.30; imag[8] = 0.45; imag[10] = 0.18; imag[12] = 0.12;
    } else if (ch === "v8-flat") {
      // Ferrari flat-plane: bright, even harmonics dominate.
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.60; imag[2] = 1.00; imag[3] = 0.55; imag[4] = 0.85;
      imag[5] = 0.40; imag[6] = 0.55; imag[7] = 0.30; imag[8] = 0.40;
      imag[10] = 0.25; imag[14] = 0.18; imag[16] = 0.15;
    } else if (ch === "v12-na") {
      // V12 NA: dense harmonic stack, screams at high RPM.
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.55; imag[2] = 0.85; imag[3] = 0.65; imag[4] = 0.55;
      imag[5] = 0.40; imag[6] = 0.85; imag[7] = 0.30; imag[8] = 0.40;
      imag[9] = 0.20; imag[10] = 0.30; imag[12] = 0.40; imag[14] = 0.20;
      imag[18] = 0.15; imag[24] = 0.10;
    } else if (ch === "flat6-turbo") {
      // Porsche flat-6 with turbo: metallic, bright 3rd & 9th.
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.55; imag[2] = 0.50; imag[3] = 1.00; imag[4] = 0.30;
      imag[5] = 0.25; imag[6] = 0.55; imag[7] = 0.20; imag[9] = 0.45;
      imag[12] = 0.25; imag[15] = 0.15;
    } else if (ch === "flat6-na") {
      // 911 GT3 NA: pure metallic howl.
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.45; imag[3] = 1.00; imag[5] = 0.55; imag[7] = 0.45;
      imag[9] = 0.55; imag[11] = 0.30; imag[13] = 0.25;
      imag[15] = 0.20; imag[18] = 0.15;
    } else if (ch === "i6-turbo") {
      // BMW S58 / smooth I6 with turbo: dense low harmonics
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 1.00; imag[2] = 0.55; imag[3] = 0.85; imag[4] = 0.40;
      imag[5] = 0.20; imag[6] = 0.55; imag[8] = 0.30; imag[12] = 0.18;
    } else if (ch === "i4-na") {
      // BMW E30 S14: high-revving 4-banger raucous
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.95; imag[2] = 0.85; imag[3] = 0.40; imag[4] = 0.55;
      imag[5] = 0.20; imag[6] = 0.30; imag[8] = 0.20;
    } else if (ch === "i4-turbo") {
      // EA888 / B58: gritty mid with strong 2nd
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 1.00; imag[2] = 0.65; imag[3] = 0.30; imag[4] = 0.20;
      imag[5] = 0.12; imag[6] = 0.20;
    } else if (ch === "w16") {
      // Bugatti W16: complex deep spectrum
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.95; imag[2] = 0.75; imag[3] = 0.55; imag[4] = 0.50;
      imag[5] = 0.30; imag[6] = 0.40; imag[7] = 0.20; imag[8] = 0.30;
      imag[10] = 0.20; imag[12] = 0.15; imag[16] = 0.10;
    } else if (ch === "ev") {
      // Inverter whine — only high harmonics
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[2] = 0.45; imag[4] = 0.85; imag[6] = 0.45; imag[8] = 0.25;
      imag[12] = 0.18;
    } else if (ch === "diesel-v8") {
      // Diesel: dominant fundamental, low harmonics, gritty
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 1.00; imag[2] = 0.35; imag[3] = 0.30; imag[5] = 0.18;
    } else if (ch === "toy") {
      // Toy car: soft sine-like
      for (let n = 0; n < N; n++) imag[n] = 0;
      imag[1] = 0.85; imag[2] = 0.30; imag[3] = 0.10;
    }

    const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this._waveCache[key] = wave;
    return wave;
  }

  // Engine-specific formant peaks. Each formant is a peaking filter at a
  // resonant frequency that gives the engine its characteristic "vowel".
  _getFormants(profile) {
    const ch = profile.character;
    switch (ch) {
      case "v8-cross":   return [{f: 200, q: 1.4, g: 7}, {f: 600, q: 1.0, g: 4}, {f: 1700, q: 0.8, g: -3}];
      case "v8-flat":    return [{f: 700, q: 1.2, g: 6}, {f: 2300, q: 1.0, g: 5}];
      case "v12-na":     return [{f: 600, q: 1.0, g: 5}, {f: 1700, q: 1.2, g: 6}, {f: 3300, q: 0.9, g: 4}];
      case "flat6-turbo":return [{f: 850, q: 1.4, g: 6}, {f: 1900, q: 1.5, g: 5}, {f: 3500, q: 0.8, g: 2}];
      case "flat6-na":   return [{f: 950, q: 1.5, g: 7}, {f: 2400, q: 1.6, g: 6}, {f: 4200, q: 0.8, g: 3}];
      case "i6-turbo":   return [{f: 320, q: 1.2, g: 4}, {f: 1100, q: 1.0, g: 5}, {f: 2400, q: 0.8, g: 2}];
      case "i4-na":      return [{f: 480, q: 1.3, g: 4}, {f: 1300, q: 1.2, g: 6}, {f: 2700, q: 0.9, g: 3}];
      case "i4-turbo":   return [{f: 350, q: 1.3, g: 4}, {f: 1100, q: 1.4, g: 5}];
      case "w16":        return [{f: 150, q: 1.5, g: 8}, {f: 450, q: 1.0, g: 5}, {f: 1500, q: 0.9, g: 3}];
      case "ev":         return [{f: 1200, q: 4, g: 8}, {f: 4000, q: 2, g: 4}];
      case "diesel-v8":  return [{f: 110, q: 2, g: 9}, {f: 380, q: 1.2, g: 5}, {f: 1100, q: 1.0, g: 2}];
      case "toy":        return [{f: 800, q: 1.5, g: 5}];
      default:           return [{f: 220, q: 1.2, g: 5}, {f: 900, q: 1.0, g: 3}];
    }
  }

  setProfile(profile) {
    if (!this.ctx) return;
    const wasRunning = this._running;
    this.stop();
    this.profile = profile;
    this._buildGraph();
    this.targetRpm = profile.idleRpm;
    this.rpm = profile.idleRpm;
    this.boost = 0; this.targetBoost = 0;
    if (wasRunning) this.start();
  }

  // ─── Real recording playback ───────────────────────────────────────
  async setSampleUrl(url) {
    if (!this.ctx || !url) return;
    try {
      const r = await fetch(url, { mode: "cors" });
      const buf = await r.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(buf);
      this._sampleBuffer = decoded;
      this._installSamplePlayer();
    } catch (e) { console.warn("Could not load sample:", e); }
  }
  setSampleBuffer(audioBuffer) {
    if (!this.ctx || !audioBuffer) return;
    this._sampleBuffer = audioBuffer;
    this._installSamplePlayer();
  }
  clearSample() {
    if (this._sampleSrc) {
      try { this._sampleSrc.stop(); } catch(e) {}
      try { this._sampleSrc.disconnect(); } catch(e) {}
      this._sampleSrc = null;
    }
    if (this._sampleGain) {
      try { this._sampleGain.disconnect(); } catch(e) {}
      this._sampleGain = null;
    }
    this._sampleBuffer = null;
  }
  _installSamplePlayer() {
    if (!this.ctx || !this._sampleBuffer) return;
    if (this._sampleSrc) {
      try { this._sampleSrc.stop(); } catch(e) {}
      try { this._sampleSrc.disconnect(); } catch(e) {}
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this._sampleBuffer;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(g).connect(this.master);
    src.start();
    this._sampleSrc = src;
    this._sampleGain = g;
    if (this._nodes && this._nodes.engineBus) {
      this._nodes.engineBus.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.2);
    }
  }

  _buildGraph() {
    const ctx = this.ctx;
    const p = this.profile;
    const nodes = { sources: [], stop: () => {
      for (const s of nodes.sources) {
        try { s.stop(); } catch(e) {}
        try { s.disconnect(); } catch(e) {}
      }
    }};

    const engineBus = ctx.createGain();
    engineBus.gain.value = 0.42;
    nodes.engineBus = engineBus;

    // Build the formant chain: each is a peaking BiquadFilter in series.
    const formants = this._getFormants(p);
    let cur = engineBus;
    for (const f of formants) {
      const bq = ctx.createBiquadFilter();
      bq.type = "peaking";
      bq.frequency.value = f.f;
      bq.Q.value = f.q;
      bq.gain.value = f.g;
      cur.connect(bq);
      cur = bq;
    }
    // Final tone shaping
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 6500; lp.Q.value = 0.5;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 35;
    cur.connect(hp).connect(lp).connect(this.master);
    nodes.engineHP = hp; nodes.engineLP = lp;

    // ── Custom-wave fundamental oscillator ──
    const wave = this._getEngineWave(p);
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = p.fundHz;
    osc.detune.value = (Math.random()-0.5) * 6;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.0001;
    osc.connect(oscGain).connect(engineBus);
    osc.start();
    nodes.osc = osc; nodes.oscGain = oscGain;
    nodes.sources.push(osc);

    // Slight 2nd voice for thickness, detuned
    const osc2 = ctx.createOscillator();
    osc2.setPeriodicWave(wave);
    osc2.frequency.value = p.fundHz;
    osc2.detune.value = 9 + (Math.random()-0.5)*4;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.0001;
    osc2.connect(osc2Gain).connect(engineBus);
    osc2.start();
    nodes.osc2 = osc2; nodes.osc2Gain = osc2Gain;
    nodes.sources.push(osc2);

    // ── Sub-bass for rumble (sine at half fundamental) ──
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = Math.max(20, p.fundHz * 0.5);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.0001;
    sub.connect(subGain).connect(engineBus);
    sub.start();
    nodes.sub = sub; nodes.subGain = subGain;
    nodes.sources.push(sub);

    // ── Combustion grit (filtered noise) ──
    const grit = ctx.createBufferSource();
    grit.buffer = this._pinkNoise; grit.loop = true;
    const gritBP = ctx.createBiquadFilter();
    gritBP.type = "bandpass"; gritBP.frequency.value = 700; gritBP.Q.value = 0.8;
    const gritGain = ctx.createGain();
    gritGain.gain.value = 0.0001;
    grit.connect(gritBP).connect(gritGain).connect(engineBus);
    grit.start();
    nodes.gritBP = gritBP; nodes.gritGain = gritGain;
    nodes.sources.push(grit);

    // ── Turbo whistle (BP noise high Q) ──
    const tnoise = ctx.createBufferSource();
    tnoise.buffer = this._whiteNoise; tnoise.loop = true;
    const tBP = ctx.createBiquadFilter();
    tBP.type = "bandpass"; tBP.frequency.value = 3500; tBP.Q.value = 24;
    const tGain = ctx.createGain();
    tGain.gain.value = 0.0001;
    tnoise.connect(tBP).connect(tGain).connect(this.master);
    tnoise.start();
    nodes.turboBP = tBP; nodes.turboGain = tGain;
    nodes.sources.push(tnoise);

    // ── Crackle/pops on overrun ──
    const cnoise = ctx.createBufferSource();
    cnoise.buffer = this._whiteNoise; cnoise.loop = true;
    const cBP = ctx.createBiquadFilter();
    cBP.type = "bandpass"; cBP.frequency.value = 2000; cBP.Q.value = 1.0;
    const cGain = ctx.createGain();
    cGain.gain.value = 0.0001;
    cnoise.connect(cBP).connect(cGain).connect(this.master);
    cnoise.start();
    nodes.crackGain = cGain;
    nodes.sources.push(cnoise);

    // ── Brake squeal ──
    const bo = ctx.createOscillator();
    bo.type = "square"; bo.frequency.value = 1900;
    const blfo = ctx.createOscillator();
    blfo.type = "sine"; blfo.frequency.value = 7;
    const blfoGain = ctx.createGain(); blfoGain.gain.value = 60;
    blfo.connect(blfoGain).connect(bo.frequency);
    const bg = ctx.createGain(); bg.gain.value = 0.0001;
    const bhp = ctx.createBiquadFilter();
    bhp.type = "highpass"; bhp.frequency.value = 1500;
    bo.connect(bhp).connect(bg).connect(this.master);
    bo.start(); blfo.start();
    nodes.brakeOsc = bo; nodes.brakeGain = bg;
    nodes.sources.push(bo, blfo);

    this._nodes = nodes;
  }

  start() {
    if (!this.ctx || this._running) return;
    this._running = true;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.30, t + 0.3);
    }
    this.lastUpdate = performance.now();
    this._loop();
  }

  stop() {
    if (!this.ctx) return;
    this._running = false;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.0, t + 0.20);
    }
    if (this._nodes) { this._nodes.stop(); this._nodes = null; }
  }

  setControls({throttle, brake, turbo}) {
    this.throttle = Math.max(0, Math.min(1, throttle));
    this.brake = Math.max(0, Math.min(1, brake));
    this._turboBtn = turbo ? 1 : 0;
  }

  getRpm() { return this.rpm; }
  getBoost() { return this.boost; }

  _loop() {
    if (!this._running || !this.profile || !this._nodes) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    const p = this.profile;
    const ctx = this.ctx;
    const n = this._nodes;

    // ── RPM tracking ──
    const idle = p.idleRpm, red = p.redRpm;
    const span = red - idle;
    let target = idle + this.throttle * span;
    if (this.brake > 0.05) target = Math.max(idle, target * (1 - 0.5 * this.brake));
    this.targetRpm = target;
    const upRate = p.electric ? 9000 : (1700 + 1200 * (1 - this.brake));
    const downRate = p.electric ? 12000 : 2200;
    const diff = this.targetRpm - this.rpm;
    const rate = diff > 0 ? upRate : downRate;
    this.rpm += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    if (!p.electric && this.rpm < idle * 0.9) this.rpm = idle * 0.9;

    // ── Boost ──
    const wantBoost = (this._turboBtn && this.throttle > 0.4) ? 1.0
                     : (this.throttle > 0.6 ? this.throttle : 0);
    this.targetBoost = wantBoost;
    const bDiff = this.targetBoost - this.boost;
    this.boost += Math.sign(bDiff) * Math.min(Math.abs(bDiff), (bDiff>0?0.9:2.0) * dt);

    // ── Frequencies ──
    const fund = p.fundHz * (this.rpm / Math.max(1, idle));
    const t = ctx.currentTime;

    // Fundamental + thickening voice
    const tilt = 1 + (this.rpm / red - 0.5) * 0.45; // brighter higher RPM
    const oscLevel = 0.42 * (0.45 + 0.55 * this.throttle) * tilt;
    const sampleAttenuation = (this._sampleBuffer ? 0.25 : 1.0);
    n.osc.frequency.setTargetAtTime(fund, t, 0.03);
    n.osc2.frequency.setTargetAtTime(fund, t, 0.03);
    n.oscGain.gain.setTargetAtTime(Math.max(0.0001, oscLevel * 0.7 * sampleAttenuation), t, 0.05);
    n.osc2Gain.gain.setTargetAtTime(Math.max(0.0001, oscLevel * 0.45 * sampleAttenuation), t, 0.05);

    // Sub
    n.sub.frequency.setTargetAtTime(Math.max(20, fund * 0.5), t, 0.05);
    const subLevel = (p.rumble || 0) * 0.35 * (0.5 + 0.5 * this.throttle) * sampleAttenuation;
    n.subGain.gain.setTargetAtTime(Math.max(0.0001, subLevel), t, 0.08);

    // Grit
    {
      const lvl = (p.grit || 0) * 0.32 * (0.20 + 0.60 * this.throttle) * (0.6 + 0.4*this.rpm/red) * sampleAttenuation;
      n.gritBP.frequency.setTargetAtTime(450 + 1700 * (this.rpm/red), t, 0.05);
      n.gritGain.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.05);
    }

    // Turbo whistle
    {
      const lvl = (p.turboWhistle || 0) * Math.max(0, this.boost - 0.05) * (0.4 + 0.6*this.throttle) * 0.55;
      n.turboBP.frequency.setTargetAtTime(2400 + 5000 * this.boost * (0.5 + 0.5*this.rpm/red), t, 0.04);
      n.turboGain.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.05);
    }

    // Crackles on overrun
    {
      const overrun = (this.rpm > idle * 2.2) && (this.throttle < 0.1) ? 1 : 0;
      if (overrun && Math.random() < 0.18 && p.crackle > 0) {
        const popLvl = 0.20 * p.crackle;
        n.crackGain.gain.cancelScheduledValues(t);
        n.crackGain.gain.setValueAtTime(popLvl, t);
        n.crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      }
    }

    // Brake squeal
    {
      const squeal = this.brake > 0.4 && this.rpm > idle * 1.05 ? this.brake : 0;
      n.brakeOsc.frequency.setTargetAtTime(1500 + 600 * this.brake, t, 0.05);
      n.brakeGain.gain.setTargetAtTime(Math.max(0.0001, squeal * 0.045), t, 0.05);
    }

    // Real recording playback rate
    if (this._sampleSrc && this._sampleGain) {
      const rate = 0.7 + 0.9 * (this.rpm / red);
      try { this._sampleSrc.playbackRate.setTargetAtTime(rate, t, 0.05); } catch(e) {}
      const targetVol = 0.40 + 0.45 * this.throttle;
      this._sampleGain.gain.setTargetAtTime(targetVol, t, 0.08);
    }

    requestAnimationFrame(() => this._loop());
  }

  honk() {
    if (!this.ctx || !this.profile) return;
    const t = this.ctx.currentTime;
    const [f1, f2] = this.profile.hornFreqs || [380, 480];
    const make = (freq) => {
      const o1 = this.ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = freq;
      const o2 = this.ctx.createOscillator(); o2.type = "square"; o2.frequency.value = freq * 0.5;
      const g = this.ctx.createGain(); g.gain.value = 0.0001;
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
      o1.connect(g); o2.connect(g); g.connect(lp).connect(this.master);
      o1.start(); o2.start();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      g.gain.setTargetAtTime(0.0001, t + 0.45, 0.04);
      o1.stop(t + 0.7); o2.stop(t + 0.7);
    };
    make(f1); make(f2);
  }
}
