// Wrap the entire bootstrap so any thrown error is reported to the inline
// loader (which then surfaces it to the user with a retry button).
(async function bootstrap() {
try {

const { Showroom } = await import("./scene.js");
const { CARS } = await import("./cars.js");
const { EngineAudio } = await import("./audio.js");

// ---------- DOM helpers ----------
const $ = (s) => document.querySelector(s);

const startScreen = $("#start");
const startBtn = $("#startBtn");
const carListEl = $("#carList");
const currentCarEl = $("#currentCar");
const rpmRing = $("#rpmRing");
const speedRing = $("#speedRing");
const rpmText = $("#rpmText");
const speedText = $("#speedText");
const boostFill = $("#boostFill");
const statusState = $("#statusState");
const statusGear = $("#statusGear");
const statusEngine = $("#statusEngine");
const infoName = $("#infoName");
const infoTagline = $("#infoTagline");
const infoEngine = $("#infoEngine");
const infoPower = $("#infoPower");
const infoTop = $("#infoTop");
const infoZero = $("#infoZero");

// ---------- Build scene ----------
const canvas = $("#scene");
const showroom = new Showroom(canvas);
showroom.populate(CARS);

const audio = new EngineAudio();

// ---------- Garage list UI ----------
function colorHex(n) {
  return "#" + n.toString(16).padStart(6, "0");
}
function buildList() {
  carListEl.innerHTML = "";
  CARS.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "car-item" + (i === 0 ? " active" : "");
    el.innerHTML = `
      <div class="swatch" style="background:${colorHex(c.color)}"></div>
      <div class="car-info">
        <div class="nm">${c.name}</div>
        <div class="en">${c.engine.label}</div>
      </div>`;
    el.addEventListener("click", () => selectCar(i));
    carListEl.appendChild(el);
  });
}
buildList();

function selectCar(i) {
  showroom.setActive(i);
  document.querySelectorAll(".car-item").forEach((el, idx) => {
    el.classList.toggle("active", idx === i);
  });
  const c = CARS[i];
  currentCarEl.textContent = c.name;
  infoName.textContent = c.name;
  infoTagline.textContent = c.tagline + (c.inspiredBy ? ` — مستوحاة من ${c.inspiredBy}` : "");
  infoEngine.textContent = c.engine.label;
  infoPower.textContent = c.power;
  infoTop.textContent = c.topSpeed;
  infoZero.textContent = c.zero100;
  statusEngine.textContent = c.engine.type;
  if (audio.ctx) {
    audio.clearSample();
    audio.setProfile(c.engine);
    if (c.sampleUrl) audio.setSampleUrl(c.sampleUrl);
  }
}
selectCar(0);

$("#prevCar").addEventListener("click", () => {
  selectCar((showroom.activeIndex - 1 + CARS.length) % CARS.length);
});
$("#nextCar").addEventListener("click", () => {
  selectCar((showroom.activeIndex + 1) % CARS.length);
});

// Notify the inline loader that we finished bootstrapping
window.dispatchEvent(new CustomEvent("app-ready"));

// ---------- Start (required for AudioContext) ----------
startBtn.addEventListener("click", async () => {
  startScreen.classList.add("hidden");
  await audio.init();
  audio.setProfile(CARS[showroom.activeIndex].engine);
  audio.start();
});

// ---------- Drag & drop a real engine recording onto the page ---------
// Drop any MP3/WAV/OGG file to use it as the active car's engine sound.
// The procedural synth is automatically dimmed and the recording's
// playback rate tracks RPM live, so it responds to the throttle.
const dropHint = document.createElement("div");
dropHint.id = "dropHint";
dropHint.innerHTML = `
  <div class="drop-card">
    <div class="drop-icon">⬇</div>
    <div class="drop-title">اسحب ملف صوت المحرك هنا</div>
    <div class="drop-sub">سيُشغَّل مباشرة كصوت السيارة الحالية وستستجيب الـ RPM لدعستك</div>
  </div>`;
dropHint.style.cssText = "position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(5,7,13,0.85);backdrop-filter:blur(6px);pointer-events:none";
document.body.appendChild(dropHint);
const dropStyle = document.createElement("style");
dropStyle.textContent = `
  #dropHint .drop-card{background:rgba(10,15,28,0.95);border:2px dashed var(--acc);border-radius:18px;padding:36px 40px;text-align:center;box-shadow:0 0 80px rgba(39,224,255,0.3) inset}
  #dropHint .drop-icon{font-size:60px;color:var(--acc);margin-bottom:8px;animation:bob 1.2s ease-in-out infinite}
  #dropHint .drop-title{font-size:22px;font-weight:800;letter-spacing:1px}
  #dropHint .drop-sub{color:var(--mut);font-size:13px;margin-top:8px}
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
`;
document.head.appendChild(dropStyle);

["dragenter","dragover"].forEach(ev => {
  window.addEventListener(ev, (e) => {
    if (e.dataTransfer && [...e.dataTransfer.items].some(i => i.kind === "file")) {
      e.preventDefault();
      dropHint.style.display = "flex";
    }
  });
});
["dragleave","drop"].forEach(ev => {
  window.addEventListener(ev, (e) => {
    if (ev === "dragleave" && e.relatedTarget) return;
    dropHint.style.display = "none";
  });
});
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const name = file.name.toLowerCase();

  // 3D model drop: .glb / .gltf
  if (name.endsWith(".glb") || name.endsWith(".gltf") || file.type.includes("gltf")) {
    const url = URL.createObjectURL(file);
    try {
      await showroom.loadUserGLBOnActive(url);
      currentCarEl.textContent = "REAL: " + file.name.slice(0, 22);
    } catch (err) {
      console.warn("GLB load failed", err);
      alert("تعذّر تحميل الموديل ثلاثي الأبعاد: " + (err && err.message || err));
    }
    return;
  }

  // Audio drop: any audio/* file
  if (file.type.startsWith("audio/") ||
      [".mp3",".wav",".ogg",".m4a",".flac"].some(x => name.endsWith(x))) {
    if (!audio.ctx) await audio.init();
    try {
      const buf = await file.arrayBuffer();
      const decoded = await audio.ctx.decodeAudioData(buf);
      audio.setSampleBuffer(decoded);
      statusEngine.textContent = "REAL: " + file.name.slice(0, 18);
    } catch (err) {
      console.warn("decode failed", err);
      alert("تعذّر فكّ ترميز الملف الصوتي");
    }
    return;
  }

  alert("نوع الملف غير مدعوم — استخدم MP3/WAV/OGG للصوت أو GLB/GLTF للموديل");
});

// ---------- Keyboard controls ----------
const keys = new Set();
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["w","s","a","d","arrowup","arrowdown","arrowleft","arrowright"," ","shift","h","l","c"].includes(k)) {
    e.preventDefault();
  }
  if (!keys.has(k)) {
    if (k === "h") audio.honk();
    if (k === "l") {
      headlightsOn = !headlightsOn;
      showroom.setHeadlights(headlightsOn);
    }
    if (k === "c") showroom.cycleCamera();
    if (k === "arrowleft") selectCar((showroom.activeIndex - 1 + CARS.length) % CARS.length);
    if (k === "arrowright") selectCar((showroom.activeIndex + 1) % CARS.length);
  }
  keys.add(k);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

let headlightsOn = false;

// ---------- HUD updaters ----------
function setRpmRing(rpm, red) {
  const frac = Math.max(0, Math.min(1, rpm / red));
  // ring length = 540 (2*pi*r ~ 540 for r=86)
  rpmRing.style.strokeDashoffset = String(540 - 540 * frac);
  rpmText.textContent = (rpm / 1000).toFixed(1);
}
function setSpeedRing(kmh) {
  const frac = Math.max(0, Math.min(1, kmh / 360));
  speedRing.style.strokeDashoffset = String(540 - 540 * frac);
  speedText.textContent = Math.round(kmh);
}
function setBoost(b) {
  boostFill.style.width = (b * 100) + "%";
}

// ---------- Main loop ----------
let speed = 0; // pseudo speed in km/h
function frame() {
  const car = CARS[showroom.activeIndex];
  const profile = car.engine;

  const throttle = (keys.has("w") || keys.has("arrowup")) ? 1 : 0;
  const brake = (keys.has("s") || keys.has("arrowdown") || keys.has(" ")) ? 1 : 0;
  const turbo = keys.has("shift");

  audio.setControls({ throttle, brake, turbo });

  const rpm = audio.getRpm();
  const boost = audio.getBoost();
  const idle = profile.idleRpm || 800;

  // pseudo speed: integrate throttle*power - brake - drag
  const power = parseInt((car.power || "400").replace(/[^0-9]/g, "")) || 400;
  const accel = throttle * (power / 90) * (1 + 0.4 * boost);
  speed += accel * 0.04;
  speed -= brake * 4.5;
  speed -= speed * 0.012; // drag
  if (speed < 0) speed = 0;
  if (speed > 360) speed = 360;

  setRpmRing(rpm, profile.redRpm || 7000);
  setSpeedRing(speed);
  setBoost(boost);
  // gear is just for display
  let gear = "N";
  if (profile.electric) gear = throttle > 0 ? "D" : (brake > 0 ? "B" : "P");
  else {
    if (speed < 20) gear = throttle > 0 ? "1" : "N";
    else if (speed < 60) gear = "2";
    else if (speed < 110) gear = "3";
    else if (speed < 170) gear = "4";
    else if (speed < 240) gear = "5";
    else gear = "6";
  }
  statusGear.textContent = gear;
  if (turbo && throttle > 0) statusState.textContent = "TURBO";
  else if (throttle > 0) statusState.textContent = "ACCEL";
  else if (brake > 0) statusState.textContent = "BRAKE";
  else statusState.textContent = "IDLE";

  showroom.drive(rpm, throttle, brake);
  showroom.setBrakeIntensity(brake);
  showroom.update();

  requestAnimationFrame(frame);
}
frame();

} catch (err) {
  console.error("[bootstrap] failed:", err);
  window.dispatchEvent(new CustomEvent("app-error", {
    detail: (err && err.message) ? err.message : String(err)
  }));
}
})();
