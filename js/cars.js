// Car catalogue — 10 photoreal artist-made GLB models.
// Each entry has a unique engine "character" key so the audio synth gives
// each car its own distinct voice (see js/audio.js for the per-character
// PeriodicWave + formant filter signature).

export const CARS = [
  // ──────────────────────────────────────────────────────────────────
  // Bavarian M3 E30  — Martin Trafas (Sketchfab @TinoD2 / @Bexxie) — CC-BY 4.0
  // https://sketchfab.com/3d-models/free-bmw-m3-e30-ac3c7013434e403e8faff87948caf422
  // ──────────────────────────────────────────────────────────────────
  {
    id: "bmw-m3-e30",
    name: "Bavarian M3 E30",
    inspiredBy: "BMW M3 E30",
    tagline: "موديل Sketchfab — Martin Trafas (CC-BY)",
    modelUrl: "models/photoreal/bmw-m3-e30.glb",
    targetLength: 4.4,
    color: 0xeef0f3, accent: 0xc6cdd6, rim: 0x202428,
    photoreal: true,
    power: "238 HP", topSpeed: "243 km/h", zero100: "6.7s",
    engine: {
      label: "I4 2.3L S14 NA",
      type: "I4 NA", character: "i4-na", cylinders: 2,
      idleRpm: 880, redRpm: 7250, fundHz: 75,
      crackle: 0.30, grit: 0.45, rumble: 0.45,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [349, 440],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Stuttgart Carrera 4S — Lionsharp Studios — CC-BY-SA 4.0
  // ──────────────────────────────────────────────────────────────────
  {
    id: "porsche-carrera",
    name: "Stuttgart Carrera 4S",
    inspiredBy: "Porsche 911 Carrera 4S",
    tagline: "موديل Lionsharp Studios — Flat-6 BiTurbo (CC-BY-SA)",
    modelUrl: "models/photoreal/porsche-911-carrera-4s.glb",
    targetLength: 4.5,
    color: 0xefefe9, accent: 0xb0b3b8, rim: 0x202428,
    photoreal: true,
    power: "443 HP", topSpeed: "306 km/h", zero100: "3.4s",
    engine: {
      label: "Flat-6 3.0L BiTurbo",
      type: "Flat-6 Turbo", character: "flat6-turbo", cylinders: 3,
      idleRpm: 850, redRpm: 7500, fundHz: 80,
      crackle: 0.25, grit: 0.20, rumble: 0.40,
      turboWhistle: 0.65, blower: 0.0,
      hornFreqs: [466, 587],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Maranello Berlinetta — Three.js Ferrari 458 — MIT
  // ──────────────────────────────────────────────────────────────────
  {
    id: "ferrari-458",
    name: "Maranello Berlinetta",
    inspiredBy: "Ferrari 458",
    tagline: "موديل Three.js examples — V8 Flat-plane (MIT)",
    modelUrl: "models/threejs/ferrari.glb",
    targetLength: 4.55,
    color: 0xc41e2c, accent: 0xffd84d, rim: 0x111111,
    photoreal: true,
    power: "562 HP", topSpeed: "325 km/h", zero100: "3.0s",
    engine: {
      label: "V8 4.5L NA Flat-plane",
      type: "V8 FP", character: "v8-flat", cylinders: 4,
      idleRpm: 980, redRpm: 9000, fundHz: 88,
      crackle: 0.35, grit: 0.18, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Sant'Agata Countach — Lexyc16 — CC-BY-NC 4.0
  // ──────────────────────────────────────────────────────────────────
  {
    id: "lambo-countach",
    name: "Sant'Agata Countach LPI",
    inspiredBy: "Lamborghini Countach LPI 800-4",
    tagline: "موديل Lexyc16 — V12 NA scream (CC-BY-NC)",
    modelUrl: "models/photoreal/lambo-countach.glb",
    targetLength: 4.85,
    color: 0xfb9b00, accent: 0x111111, rim: 0x111111,
    photoreal: true,
    power: "780 HP", topSpeed: "355 km/h", zero100: "2.8s",
    engine: {
      label: "V12 6.5L NA",
      type: "V12 NA", character: "v12-na", cylinders: 6,
      idleRpm: 950, redRpm: 8800, fundHz: 95,
      crackle: 0.20, grit: 0.20, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [415, 523],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Concept W16 — Khronos CarConcept — CC-BY 4.0
  // ──────────────────────────────────────────────────────────────────
  {
    id: "concept-w16",
    name: "Concept W16 Quad-Turbo",
    inspiredBy: "Bugatti-style hypercar — Khronos CarConcept",
    tagline: "موديل Khronos الرسمي — W16 quad-turbo (CC-BY)",
    modelUrl: "models/khronos/CarConcept.glb",
    targetLength: 4.7,
    color: 0x0f1830, accent: 0x4a90e2, rim: 0x4a90e2,
    photoreal: true,
    power: "1500 HP", topSpeed: "440 km/h", zero100: "2.4s",
    engine: {
      label: "W16 8.0L Quad-Turbo",
      type: "W16", character: "w16", cylinders: 8,
      idleRpm: 900, redRpm: 6900, fundHz: 110,
      crackle: 0.25, grit: 0.20, rumble: 0.55,
      turboWhistle: 0.95, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // ★ NEW · Detroit Shelby GT500 — Jiaxing (saitoyang) — CC-BY 4.0
  // https://sketchfab.com/3d-models/ford-mustang-shelby-gt500-0eaa7a16796540f29461ddae05ecdeb3
  // ──────────────────────────────────────────────────────────────────
  {
    id: "shelby-gt500",
    name: "Detroit Shelby GT500",
    inspiredBy: "Ford Mustang Shelby GT500",
    tagline: "موديل Jiaxing (saitoyang) — Cross-plane V8 supercharged (CC-BY)",
    modelUrl: "models/photoreal/mustang-shelby-gt500.glb",
    targetLength: 4.8,
    color: 0x1a3fa8, accent: 0xeef2f7, rim: 0x18191c,
    photoreal: true,
    power: "760 HP", topSpeed: "290 km/h", zero100: "3.5s",
    engine: {
      label: "V8 5.2L Supercharged",
      type: "V8 SC", character: "v8-cross", cylinders: 4,
      idleRpm: 720, redRpm: 7400, fundHz: 56,
      crackle: 0.45, grit: 0.55, rumble: 0.95,
      turboWhistle: 0.0, blower: 1.0,
      hornFreqs: [311, 392],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // ★ NEW · Detroit Mustang Boss '69 — vecarz (heynic) — CC-BY 4.0
  // https://sketchfab.com/3d-models/ford-mustang-john-bowe-1969-wwwvecarzcom-91a5454aaf02492a9c7e959b8eb6db9f
  // ──────────────────────────────────────────────────────────────────
  {
    id: "mustang-1969",
    name: "Detroit Mustang Boss '69",
    inspiredBy: "Ford Mustang 1969 (John Bowe)",
    tagline: "موديل vecarz — Classic muscle V8 (CC-BY)",
    modelUrl: "models/photoreal/mustang-1969.glb",
    targetLength: 4.75,
    color: 0xd92020, accent: 0x1a1a1a, rim: 0x1a1a1a,
    photoreal: true,
    power: "375 HP", topSpeed: "210 km/h", zero100: "5.7s",
    engine: {
      label: "V8 7.0L Big-block NA",
      type: "V8 NA", character: "v8-cross", cylinders: 4,
      idleRpm: 600, redRpm: 6400, fundHz: 50,
      crackle: 0.40, grit: 0.65, rumble: 1.0,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [330, 415],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // ★ NEW · Detroit Mustang GT 2017 — IsaacOldton — CC-BY 4.0
  // https://sketchfab.com/3d-models/2017-ford-mustang-gt-7dfe5e8c4198432385f596a780c043a3
  // ──────────────────────────────────────────────────────────────────
  {
    id: "mustang-2017",
    name: "Detroit Mustang GT '17",
    inspiredBy: "2017 Ford Mustang GT",
    tagline: "موديل IsaacOldton — Modern Coyote V8 (CC-BY)",
    modelUrl: "models/photoreal/mustang-2017-gt.glb",
    targetLength: 4.78,
    color: 0xfff100, accent: 0x18191c, rim: 0x101010,
    photoreal: true,
    power: "460 HP", topSpeed: "250 km/h", zero100: "4.3s",
    engine: {
      label: "V8 5.0L Coyote NA",
      type: "V8 NA", character: "v8-cross", cylinders: 4,
      idleRpm: 700, redRpm: 7500, fundHz: 58,
      crackle: 0.55, grit: 0.45, rumble: 0.85,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [311, 392],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // ★ NEW · Neon City Hover-EV — 4d_Bob (3d_Bob) — CC-BY-NC 4.0
  // https://sketchfab.com/3d-models/cyberpunk-car-b4301ff99d214d16a7a43708a5866bf0
  // ──────────────────────────────────────────────────────────────────
  {
    id: "cyber-ev",
    name: "Neon City Hover-EV",
    inspiredBy: "Cyberpunk concept car",
    tagline: "موديل 4d_Bob — EV inverter whine (CC-BY-NC)",
    modelUrl: "models/photoreal/cyberpunk-car.glb",
    targetLength: 4.4,
    color: 0x18191e, accent: 0x27e0ff, rim: 0x27e0ff,
    photoreal: true,
    power: "1100 HP", topSpeed: "330 km/h", zero100: "1.9s",
    engine: {
      label: "Quad-Motor EV",
      type: "EV", character: "ev", cylinders: 0,
      idleRpm: 0, redRpm: 19000, fundHz: 250,
      crackle: 0.0, grit: 0.05, rumble: 0.0,
      turboWhistle: 0.0, blower: 0.0, electric: 1.0,
      hornFreqs: [493, 622],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Pixar Toy Car — Khronos sample — CC-BY 4.0
  // ──────────────────────────────────────────────────────────────────
  {
    id: "toy-car",
    name: "Pixar Toy Car",
    inspiredBy: "Pixar 'Toy Car' demo asset",
    tagline: "موديل Khronos — تفاصيل MaterialsX (CC-BY)",
    modelUrl: "models/khronos/ToyCar.glb",
    targetLength: 4.0,
    color: 0xd92020, accent: 0xfff200, rim: 0x202428,
    photoreal: true,
    power: "—", topSpeed: "—", zero100: "—",
    engine: {
      label: "Imaginary I4 Petrol",
      type: "I4", character: "toy", cylinders: 2,
      idleRpm: 800, redRpm: 6500, fundHz: 65,
      crackle: 0.10, grit: 0.30, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [392, 494],
    },
  },
];
