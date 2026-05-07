// Brand-evocative car catalog. Names are stylistic tributes — the visual
// styling cues (grille, wheels, proportions) and the engine acoustic
// profiles are tuned to closely resemble well-known real-world cars
// (Audi RS6 / R8, VW Golf GTI / Beetle, BMW M3, Mercedes-AMG GT, Porsche
// 911, Ferrari 488, Lamborghini Huracan, Nissan GT-R, Tesla S Plaid).

export const CARS = [
  // ─── Audi RS6 Avant 4.0 TFSI biturbo V8 ────────────────────────────────
  {
    id: "rs-avant",
    name: "RS-Avant 4.0 TFSI",
    inspiredBy: "Audi RS6 Avant",
    tagline: "Twin-turbo V8 super-wagon, deep growl + turbo whistle",
    body: "avant",
    color: 0x4a4f57, accent: 0xc6cdd6, rim: 0x202428,
    grille: "audi-singleframe",
    wheels: "audi-5split",
    headlights: "audi-led-strip",
    power: "630 HP", topSpeed: "305 km/h", zero100: "3.4s",
    spoiler: "lip",
    engine: {
      label: "V8 4.0L Bi-Turbo",
      type: "V8 BiTurbo", cylinders: 4,
      idleRpm: 760, redRpm: 6800,
      fundHz: 56, harmonics: [
        {mult: 1, gain: 1.00}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.30}, {mult: 4, gain: 0.45},
        {mult: 5, gain: 0.18}, {mult: 6, gain: 0.22},
      ],
      crackle: 0.55, grit: 0.55, rumble: 0.85,
      turboWhistle: 0.85, blower: 0.0,
      hornFreqs: [330, 415],
    },
  },

  // ─── Audi R8 V10 (or Lamborghini Huracan, shared platform) ────────────
  {
    id: "r-eight",
    name: "R-Eight V10",
    inspiredBy: "Audi R8 V10",
    tagline: "Naturally-aspirated V10 supercar, screams to redline",
    body: "midEngine",
    color: 0xeef2f7, accent: 0x101216, rim: 0x111111,
    grille: "audi-singleframe",
    wheels: "audi-5split",
    headlights: "audi-led-strip",
    power: "620 HP", topSpeed: "330 km/h", zero100: "3.1s",
    spoiler: "active",
    engine: {
      label: "V10 5.2L NA",
      type: "V10", cylinders: 5,
      idleRpm: 920, redRpm: 8700,
      fundHz: 80, harmonics: [
        {mult: 1, gain: 0.85}, {mult: 2, gain: 0.7},
        {mult: 3, gain: 0.55}, {mult: 5, gain: 0.45}, {mult: 7, gain: 0.20},
      ],
      crackle: 0.30, grit: 0.30, rumble: 0.45,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [415, 523],
    },
  },

  // ─── VW Golf GTI MK8 ──────────────────────────────────────────────────
  {
    id: "hot-hatch",
    name: "Hot-Hatch GTI",
    inspiredBy: "VW Golf GTI Mk8",
    tagline: "Iconic 2.0L turbo hot hatch, pops & whistle",
    body: "gti",
    color: 0xe8e8ec, accent: 0xd0182b, rim: 0x18191c,
    grille: "vw-honeycomb",
    wheels: "vw-12spoke",
    headlights: "vw-square",
    power: "245 HP", topSpeed: "250 km/h", zero100: "6.3s",
    spoiler: "lip",
    engine: {
      label: "I4 2.0L EA888 Turbo",
      type: "I4 Turbo", cylinders: 2,
      idleRpm: 820, redRpm: 6800,
      fundHz: 68, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.25}, {mult: 4, gain: 0.18}, {mult: 5, gain: 0.10},
      ],
      crackle: 0.85, grit: 0.45, rumble: 0.30,
      turboWhistle: 0.95, blower: 0.0, blowoff: 1.0,
      hornFreqs: [380, 480],
    },
  },

  // ─── VW Beetle (classic, air-cooled flat-4) ────────────────────────────
  {
    id: "vintage-bug",
    name: "Vintage Bug 1600",
    inspiredBy: "VW Beetle (classic)",
    tagline: "Air-cooled flat-4 with the unmistakable putter",
    body: "bug",
    color: 0xf2c14e, accent: 0xffffff, rim: 0xd4d4d4,
    grille: "none",
    wheels: "vw-classic",
    headlights: "round",
    power: "60 HP", topSpeed: "135 km/h", zero100: "16s",
    spoiler: "none",
    engine: {
      label: "Flat-4 1.6L Aircooled",
      type: "Boxer 4 Aircooled", cylinders: 2,
      idleRpm: 750, redRpm: 4800,
      fundHz: 48, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 1.5, gain: 0.55},
        {mult: 2, gain: 0.45}, {mult: 3, gain: 0.30},
      ],
      crackle: 0.20, grit: 0.75, rumble: 0.65,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [349, 440],
    },
  },

  // ─── BMW M3 (G80) S58 inline-6 twin-turbo ──────────────────────────────
  {
    id: "bavarian-m",
    name: "Bavarian M-Sport",
    inspiredBy: "BMW M3 G80 (S58)",
    tagline: "Twin-turbo inline-6, sharp, surgical",
    body: "m3sedan",
    color: 0x1a3fa8, accent: 0xffffff, rim: 0x111111,
    grille: "bmw-kidney",
    wheels: "bmw-10spoke",
    headlights: "bmw-laser",
    power: "510 HP", topSpeed: "290 km/h", zero100: "3.5s",
    spoiler: "lip",
    engine: {
      label: "I6 3.0L S58 BiTurbo",
      type: "I6 Turbo", cylinders: 3,
      idleRpm: 800, redRpm: 7200,
      fundHz: 75, harmonics: [
        {mult: 1, gain: 0.9}, {mult: 2, gain: 0.65},
        {mult: 3, gain: 0.55}, {mult: 4, gain: 0.35}, {mult: 6, gain: 0.20},
      ],
      crackle: 0.40, grit: 0.30, rumble: 0.45,
      turboWhistle: 0.75, blower: 0.0,
      hornFreqs: [349, 440],
    },
  },

  // ─── Porsche 911 GT3 flat-6 ────────────────────────────────────────────
  {
    id: "stuttgart-flat6",
    name: "Stuttgart Flat-Six",
    inspiredBy: "Porsche 911 GT3",
    tagline: "Naturally-aspirated rear-engine flat-6, metallic howl",
    body: "p911",
    color: 0xefefe9, accent: 0xb0b3b8, rim: 0x202428,
    grille: "none",
    wheels: "porsche-turbofan",
    headlights: "round",
    power: "510 HP", topSpeed: "318 km/h", zero100: "3.4s",
    spoiler: "wing",
    engine: {
      label: "Flat-6 4.0L NA",
      type: "Flat-6", cylinders: 3,
      idleRpm: 950, redRpm: 9000,
      fundHz: 95, harmonics: [
        {mult: 1, gain: 0.6}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.6}, {mult: 4, gain: 0.45}, {mult: 6, gain: 0.30}, {mult: 8, gain: 0.18},
      ],
      crackle: 0.20, grit: 0.25, rumble: 0.35,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [466, 587],
    },
  },

  // ─── Ferrari 488 GTB / Pista flat-plane V8 twin-turbo ─────────────────
  {
    id: "maranello-v8",
    name: "Maranello Berlinetta",
    inspiredBy: "Ferrari 488",
    tagline: "Flat-plane V8 twin-turbo, race-bred banshee",
    body: "midEngine",
    color: 0xd62024, accent: 0xfff200, rim: 0x111111,
    grille: "ferrari-cross",
    wheels: "ferrari-twin5",
    headlights: "slant-led",
    power: "710 HP", topSpeed: "340 km/h", zero100: "2.85s",
    spoiler: "active",
    engine: {
      label: "V8 3.9L Bi-Turbo Flat-plane",
      type: "V8 FP TT", cylinders: 4,
      idleRpm: 980, redRpm: 8000,
      fundHz: 88, harmonics: [
        {mult: 1, gain: 0.55}, {mult: 2, gain: 0.95},
        {mult: 3, gain: 0.65}, {mult: 4, gain: 0.55}, {mult: 5, gain: 0.30}, {mult: 7, gain: 0.18},
      ],
      crackle: 0.35, grit: 0.20, rumble: 0.30,
      turboWhistle: 0.65, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },

  // ─── Lamborghini Huracan V10 ───────────────────────────────────────────
  {
    id: "santagata-bull",
    name: "Sant'Agata Bull V10",
    inspiredBy: "Lamborghini Huracan EVO",
    tagline: "Naturally-aspirated V10 angular hyper, sharp & operatic",
    body: "midEngine",
    color: 0xfb9b00, accent: 0x111111, rim: 0x111111,
    grille: "lambo-y",
    wheels: "lambo-arrow",
    headlights: "y-led",
    power: "640 HP", topSpeed: "325 km/h", zero100: "2.9s",
    spoiler: "active",
    engine: {
      label: "V10 5.2L NA",
      type: "V10", cylinders: 5,
      idleRpm: 950, redRpm: 8500,
      fundHz: 84, harmonics: [
        {mult: 1, gain: 0.7}, {mult: 2, gain: 0.65},
        {mult: 3, gain: 0.55}, {mult: 4, gain: 0.40}, {mult: 5, gain: 0.50}, {mult: 7, gain: 0.22},
      ],
      crackle: 0.30, grit: 0.30, rumble: 0.40,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [466, 587],
    },
  },

  // ─── Mercedes-AMG GT 4.0 V8 biturbo ────────────────────────────────────
  {
    id: "stuttgart-amg",
    name: "Stuttgart AMG-GT",
    inspiredBy: "Mercedes-AMG GT",
    tagline: "Hand-built V8 biturbo, deep cross-plane V8 burble",
    body: "amg",
    color: 0x101216, accent: 0xc6cdd6, rim: 0x303030,
    grille: "amg-mesh",
    wheels: "amg-cross",
    headlights: "slant-led",
    power: "585 HP", topSpeed: "318 km/h", zero100: "3.6s",
    spoiler: "active",
    engine: {
      label: "V8 4.0L M178 BiTurbo",
      type: "V8 BiTurbo", cylinders: 4,
      idleRpm: 720, redRpm: 7000,
      fundHz: 60, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.30}, {mult: 4, gain: 0.40}, {mult: 5, gain: 0.18}, {mult: 6, gain: 0.22},
      ],
      crackle: 0.55, grit: 0.55, rumble: 0.85,
      turboWhistle: 0.7, blower: 0.0,
      hornFreqs: [311, 392],
    },
  },

  // ─── Nissan GT-R R35 VR38DETT ──────────────────────────────────────────
  {
    id: "yokohama-gt",
    name: "Yokohama GT-Beast",
    inspiredBy: "Nissan GT-R R35",
    tagline: "VR38 V6 twin-turbo, AWD launch monster",
    body: "gtr",
    color: 0xeef2f7, accent: 0xd0182b, rim: 0x111111,
    grille: "nissan-v",
    wheels: "nissan-rays",
    headlights: "twin-circle",
    power: "565 HP", topSpeed: "315 km/h", zero100: "2.9s",
    spoiler: "wing",
    engine: {
      label: "V6 3.8L Bi-Turbo",
      type: "V6 BiTurbo", cylinders: 3,
      idleRpm: 850, redRpm: 7100,
      fundHz: 78, harmonics: [
        {mult: 1, gain: 0.85}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.45}, {mult: 4, gain: 0.30}, {mult: 5, gain: 0.20},
      ],
      crackle: 0.30, grit: 0.30, rumble: 0.45,
      turboWhistle: 0.85, blower: 0.0,
      hornFreqs: [370, 466],
    },
  },

  // ─── Tesla Model S Plaid Tri-Motor ─────────────────────────────────────
  {
    id: "cali-plaid",
    name: "California Plaid Tri-Motor",
    inspiredBy: "Tesla Model S Plaid",
    tagline: "Tri-motor electric sedan with regenerative whine",
    body: "sedan",
    color: 0x18191e, accent: 0xeef2f7, rim: 0x202428,
    grille: "ev-flat",
    wheels: "ev-aero",
    headlights: "slim-led",
    power: "1020 HP", topSpeed: "322 km/h", zero100: "2.1s",
    spoiler: "lip",
    engine: {
      label: "Tri-Motor EV",
      type: "EV", cylinders: 0,
      idleRpm: 0, redRpm: 18000,
      fundHz: 220, harmonics: [
        {mult: 1, gain: 0.40}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.6}, {mult: 4, gain: 0.50},
      ],
      crackle: 0.0, grit: 0.05, rumble: 0.0,
      turboWhistle: 0.0, blower: 0.0, electric: 1.0,
      hornFreqs: [493, 622],
    },
  },

  // ─── Bugatti Chiron W16 Quad-turbo ─────────────────────────────────────
  {
    id: "molsheim-w16",
    name: "Molsheim W16 Quad-Turbo",
    inspiredBy: "Bugatti Chiron",
    tagline: "Quad-turbo W16 hypercar, engineering opera",
    body: "hyper",
    color: 0x0f1830, accent: 0x4a90e2, rim: 0x4a90e2,
    grille: "bugatti-horseshoe",
    wheels: "lambo-arrow",
    headlights: "slim-led",
    power: "1500 HP", topSpeed: "440 km/h", zero100: "2.4s",
    spoiler: "active",
    engine: {
      label: "W16 8.0L Quad-Turbo",
      type: "W16", cylinders: 8,
      idleRpm: 900, redRpm: 6900,
      fundHz: 110, harmonics: [
        {mult: 1, gain: 0.9}, {mult: 2, gain: 0.75},
        {mult: 3, gain: 0.55}, {mult: 4, gain: 0.45}, {mult: 6, gain: 0.30}, {mult: 8, gain: 0.20},
      ],
      crackle: 0.25, grit: 0.20, rumble: 0.55,
      turboWhistle: 0.95, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },
];
