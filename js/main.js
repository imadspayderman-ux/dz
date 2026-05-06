import { Showroom } from "./scene.js";
import { CARS } from "./cars.js";
import { EngineAudio } from "./audio.js";

// ---------- DOM helpers ----------
const $ = (s) => document.querySelector(s);

const loader = $("#loader");
const loaderFill = loader.querySelector(".fill");
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
  infoTagline.textContent = c.tagline;
  infoEngine.textContent = c.engine.label;
  infoPower.textContent = c.power;
  infoTop.textContent = c.topSpeed;
  infoZero.textContent = c.zero100;
  statusEngine.textContent = c.engine.type;
  if (audio.ctx) audio.setProfile(c.engine);
}
selectCar(0);

$("#prevCar").addEventListener("click", () => {
  selectCar((showroom.activeIndex - 1 + CARS.length) % CARS.length);
});
$("#nextCar").addEventListener("click", () => {
  selectCar((showroom.activeIndex + 1) % CARS.length);
});

// ---------- Loader bar (cosmetic) ----------
let loaderProgress = 0;
const loaderTick = setInterval(() => {
  loaderProgress = Math.min(100, loaderProgress + 6 + Math.random() * 8);
  loaderFill.style.width = loaderProgress + "%";
  if (loaderProgress >= 100) {
    clearInterval(loaderTick);
    setTimeout(() => {
      loader.classList.add("hidden");
      startScreen.classList.remove("hidden");
    }, 250);
  }
}, 80);

// ---------- Start (required for AudioContext) ----------
startBtn.addEventListener("click", async () => {
  startScreen.classList.add("hidden");
  await audio.init();
  audio.setProfile(CARS[showroom.activeIndex].engine);
  audio.start();
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
