// Procedural engine sound synthesizer using the Web Audio API.
//
// We mix several signal sources to create an authentic-sounding engine that
// reacts to throttle, RPM, and turbo:
//
//   1) Cylinder-pulse oscillator bank — the firing pulses generate a buzzy
//      saw-rich tone whose pitch tracks RPM and whose harmonics shape the
//      engine character (V8 burble, V12 scream, EV whine, ...).
//   2) Sub-bass sine at the firing frequency for low-end rumble.
//   3) Filtered noise for combustion grit, mixed by throttle.
//   4) Turbo whistle: a high-Q bandpass on noise, pitch rising with boost.
//   5) Supercharger whine: a pure tone gear-mesh at boost*RPM*ratio.
//   6) Crackle/pops on overrun (closed throttle at high RPM): random noise
//      bursts.
//   7) Brake squeal: high oscillator with vibrato when braking.
//
// All sources route into a master gain that ducks the volume when the engine
// is off.

export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.profile = null;

    this.rpm = 0;
    this.targetRpm = 0;
    this.throttle = 0;        // 0..1
    this.brake = 0;           // 0..1
    this.boost = 0;           // 0..1 (turbo lag-modeled)
    this.targetBoost = 0;
    this.lastUpdate = 0;
    this._running = false;

    // graph nodes (rebuilt per car)
    this._nodes = null;
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
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    this.master.connect(limiter).connect(this.ctx.destination);

    // ---- shared noise buffers ----
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

  setProfile(profile) {
    if (!this.ctx) return;
    this.stop();
    this.profile = profile;
    this._buildGraph();
    this.targetRpm = profile.idleRpm;
    this.rpm = profile.idleRpm;
    this.boost = 0; this.targetBoost = 0;
  }

  // ─── Real recording playback ─────────────────────────────────────────
  // If a sample is attached to the current profile (via drag-drop or
  // spec.sampleUrl), we layer it on top of the procedural synth as a
  // looped buffer whose playbackRate scales with RPM. This lets users
  // supply genuine engine recordings and hear them respond to throttle.
  async setSampleUrl(url) {
    if (!this.ctx || !url) return;
    try {
      const r = await fetch(url, { mode: "cors" });
      const buf = await r.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(buf);
      this._sampleBuffer = decoded;
      this._installSamplePlayer();
    } catch (e) {
      console.warn("Could not load sample:", e);
    }
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
    // Reduce procedural engine volume when a real sample is active
    if (this._nodes && this._nodes.engineBus) {
      this._nodes.engineBus.gain.setTargetAtTime(0.20, this.ctx.currentTime, 0.2);
    }
  }

  _buildGraph() {
    const ctx = this.ctx;
    const p = this.profile;
    const nodes = {
      sources: [],
      stop: () => {
        for (const s of nodes.sources) {
          try { s.stop(); } catch(e) {}
          try { s.disconnect(); } catch(e) {}
        }
      },
    };

    // -------- engine bus (mixed engine sounds) --------
    const engineBus = ctx.createGain();
    engineBus.gain.value = p.electric ? 0.55 : 0.85;
    nodes.engineBus = engineBus;

    // EQ shaping
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 5800; lp.Q.value = 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 30;
    engineBus.connect(hp).connect(lp).connect(this.master);

    // === 1) Harmonic firing-pulse synth (sawtooth bank) ===
    nodes.harmGains = [];
    nodes.harmOscs  = [];
    for (const h of p.harmonics) {
      const osc = ctx.createOscillator();
      osc.type = p.electric ? "triangle" : "sawtooth";
      osc.frequency.value = p.fundHz * h.mult;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      // small detune to thicken
      osc.detune.value = (Math.random()-0.5)*8;
      osc.connect(g).connect(engineBus);
      osc.start();
      nodes.harmGains.push({g, base: h.gain});
      nodes.harmOscs.push(osc);
      nodes.sources.push(osc);
    }

    // === 2) Sub-bass (rumble) ===
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = p.fundHz * 0.5;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.0001;
    subOsc.connect(subGain).connect(engineBus);
    subOsc.start();
    nodes.subOsc = subOsc; nodes.subGain = subGain;
    nodes.sources.push(subOsc);

    // === 3) Combustion grit (filtered noise) ===
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this._pinkNoise; noiseSrc.loop = true;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass"; noiseBP.frequency.value = 600; noiseBP.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0001;
    noiseSrc.connect(noiseBP).connect(noiseGain).connect(engineBus);
    noiseSrc.start();
    nodes.noiseGain = noiseGain; nodes.noiseBP = noiseBP;
    nodes.sources.push(noiseSrc);

    // === 4) Turbo whistle (BP noise with high Q) ===
    const turboSrc = ctx.createBufferSource();
    turboSrc.buffer = this._whiteNoise; turboSrc.loop = true;
    const turboBP = ctx.createBiquadFilter();
    turboBP.type = "bandpass"; turboBP.frequency.value = 3000; turboBP.Q.value = 22;
    const turboGain = ctx.createGain();
    turboGain.gain.value = 0.0001;
    turboSrc.connect(turboBP).connect(turboGain).connect(this.master);
    turboSrc.start();
    nodes.turboGain = turboGain; nodes.turboBP = turboBP;
    nodes.sources.push(turboSrc);

    // === 5) Supercharger whine (gear-mesh tone) ===
    const blowerOsc = ctx.createOscillator();
    blowerOsc.type = "square";
    blowerOsc.frequency.value = 1200;
    const blowerGain = ctx.createGain();
    blowerGain.gain.value = 0.0001;
    const blowerHP = ctx.createBiquadFilter();
    blowerHP.type = "highpass"; blowerHP.frequency.value = 800;
    blowerOsc.connect(blowerHP).connect(blowerGain).connect(this.master);
    blowerOsc.start();
    nodes.blowerOsc = blowerOsc; nodes.blowerGain = blowerGain;
    nodes.sources.push(blowerOsc);

    // === 6) Crackle (pops on overrun) — periodic env on noise ===
    const crackSrc = ctx.createBufferSource();
    crackSrc.buffer = this._whiteNoise; crackSrc.loop = true;
    const crackBP = ctx.createBiquadFilter();
    crackBP.type = "bandpass"; crackBP.frequency.value = 1800; crackBP.Q.value = 1.2;
    const crackGain = ctx.createGain();
    crackGain.gain.value = 0.0001;
    crackSrc.connect(crackBP).connect(crackGain).connect(this.master);
    crackSrc.start();
    nodes.crackGain = crackGain;
    nodes.sources.push(crackSrc);

    // === 7) Brake squeal ===
    const brakeOsc = ctx.createOscillator();
    brakeOsc.type = "square"; brakeOsc.frequency.value = 1900;
    const brakeLfo = ctx.createOscillator();
    brakeLfo.type = "sine"; brakeLfo.frequency.value = 7;
    const brakeLfoGain = ctx.createGain(); brakeLfoGain.gain.value = 60;
    brakeLfo.connect(brakeLfoGain).connect(brakeOsc.frequency);
    const brakeGain = ctx.createGain();
    brakeGain.gain.value = 0.0001;
    const brakeHP = ctx.createBiquadFilter();
    brakeHP.type = "highpass"; brakeHP.frequency.value = 1500;
    brakeOsc.connect(brakeHP).connect(brakeGain).connect(this.master);
    brakeOsc.start(); brakeLfo.start();
    nodes.brakeOsc = brakeOsc; nodes.brakeGain = brakeGain;
    nodes.sources.push(brakeOsc, brakeLfo);

    this._nodes = nodes;
  }

  start() {
    if (!this.ctx || this._running) return;
    this._running = true;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.55, t + 0.4);
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
      this.master.gain.linearRampToValueAtTime(0.0, t + 0.25);
    }
    if (this._nodes) {
      // Don't stop sources — we want smooth transitions when switching cars.
      this._nodes.stop();
      this._nodes = null;
    }
  }

  setControls({throttle, brake, turbo}) {
    this.throttle = Math.max(0, Math.min(1, throttle));
    this.brake = Math.max(0, Math.min(1, brake));
    // turbo asks for max boost capability; actual boost ramps with throttle+rpm
    this._turboBtn = turbo ? 1 : 0;
  }

  // public getters used by HUD
  getRpm() { return this.rpm; }
  getBoost() { return this.boost; }

  _loop() {
    if (!this._running || !this.profile || !this._nodes) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    const p = this.profile;
    const ctx = this.ctx;
    const nodes = this._nodes;

    // ---- target RPM from throttle ----
    const idle = p.idleRpm, red = p.redRpm;
    const span = red - idle;
    let target = idle + this.throttle * span;
    if (this.brake > 0.05) target = Math.max(idle, target * (1 - 0.5 * this.brake));
    this.targetRpm = target;

    // engine inertia: spin up slower than down for combustion engines, both
    // very fast for EV motors
    const upRate = p.electric ? 9000 : (1800 + 1200 * (1 - this.brake));
    const downRate = p.electric ? 12000 : 2400;
    const diff = this.targetRpm - this.rpm;
    const rate = diff > 0 ? upRate : downRate;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    this.rpm += step;
    if (!p.electric && this.rpm < idle * 0.9) this.rpm = idle * 0.9;

    // ---- boost target & lag ----
    const wantBoost = (this._turboBtn && this.throttle > 0.4) ? 1.0
                     : (this.throttle > 0.6 ? this.throttle : 0);
    this.targetBoost = wantBoost;
    const boostDiff = this.targetBoost - this.boost;
    this.boost += Math.sign(boostDiff) * Math.min(Math.abs(boostDiff), (boostDiff>0?0.9:2.0) * dt);

    // ---- pulse frequency from RPM ----
    const fundFreq = p.fundHz * (this.rpm / Math.max(1, idle));
    const t = ctx.currentTime;

    // 1) harmonic oscs
    const throttleBoost = 1.0 + 0.55 * this.throttle + 0.20 * this.boost;
    for (let i = 0; i < nodes.harmOscs.length; i++) {
      const osc = nodes.harmOscs[i];
      const item = nodes.harmGains[i];
      osc.frequency.setTargetAtTime(fundFreq * p.harmonics[i].mult, t, 0.03);
      const tilt = 1 + (this.rpm / red - 0.5) * 0.6; // brighter at higher RPM
      const baseLevel = item.base * 0.25 * throttleBoost * tilt;
      item.g.gain.setTargetAtTime(Math.max(0.0001, baseLevel), t, 0.05);
    }

    // 2) sub
    if (nodes.subOsc) {
      nodes.subOsc.frequency.setTargetAtTime(Math.max(20, fundFreq * 0.5), t, 0.05);
      const subLevel = (p.rumble || 0) * 0.55 * (0.5 + 0.5 * this.throttle);
      nodes.subGain.gain.setTargetAtTime(Math.max(0.0001, subLevel), t, 0.08);
    }

    // 3) grit noise
    {
      const lvl = (p.grit || 0) * (0.15 + 0.55 * this.throttle) * (0.6 + 0.4*this.rpm/red);
      nodes.noiseBP.frequency.setTargetAtTime(400 + 1600 * (this.rpm/red), t, 0.05);
      nodes.noiseGain.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.05);
    }

    // 4) turbo whistle — pitch up with boost & RPM
    {
      const whistleLvl = (p.turboWhistle || 0) * Math.max(0, this.boost - 0.05) * (0.4 + 0.6*this.throttle);
      nodes.turboBP.frequency.setTargetAtTime(2200 + 5500 * this.boost * (0.5 + 0.5*this.rpm/red), t, 0.04);
      nodes.turboGain.gain.setTargetAtTime(Math.max(0.0001, whistleLvl * 0.55), t, 0.05);
    }

    // 5) supercharger whine — proportional to RPM
    {
      const blowerFreq = 800 + 5200 * (this.rpm / red);
      nodes.blowerOsc.frequency.setTargetAtTime(blowerFreq, t, 0.03);
      const lvl = (p.blower || 0) * (0.15 + 0.6 * this.throttle);
      nodes.blowerGain.gain.setTargetAtTime(Math.max(0.0001, lvl * 0.18), t, 0.05);
    }

    // 6) crackles on overrun (high RPM + closed throttle, mostly combustion)
    {
      const overrun = (this.rpm > idle * 2.2) && (this.throttle < 0.1) ? 1 : 0;
      if (overrun && Math.random() < 0.18 && p.crackle > 0) {
        const popLvl = 0.25 * p.crackle;
        nodes.crackGain.gain.cancelScheduledValues(t);
        nodes.crackGain.gain.setValueAtTime(popLvl, t);
        nodes.crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      }
    }

    // 7) brake squeal (only audible while braking and rolling)
    {
      const squeal = this.brake > 0.4 && this.rpm > idle * 1.05 ? this.brake : 0;
      nodes.brakeOsc.frequency.setTargetAtTime(1500 + 600 * this.brake, t, 0.05);
      nodes.brakeGain.gain.setTargetAtTime(Math.max(0.0001, squeal * 0.05), t, 0.05);
    }

    // 8) Real recording playback rate + gain — loaded sample tracks RPM.
    if (this._sampleSrc && this._sampleGain) {
      const rate = 0.7 + 0.9 * (this.rpm / red);  // 0.7x..1.6x playback
      try { this._sampleSrc.playbackRate.setTargetAtTime(rate, t, 0.05); } catch(e) {}
      const targetVol = 0.45 + 0.45 * this.throttle;
      this._sampleGain.gain.setTargetAtTime(targetVol, t, 0.08);
    }

    requestAnimationFrame(() => this._loop());
  }

  // ---- horn ----
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
      g.gain.exponentialRampToValueAtTime(0.30, t + 0.03);
      g.gain.setTargetAtTime(0.0001, t + 0.45, 0.04);
      o1.stop(t + 0.7); o2.stop(t + 0.7);
    };
    make(f1); make(f2);
  }
}
