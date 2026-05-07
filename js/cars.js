// Car catalogue — every entry now loads a real PHOTOREAL 3D GLB model
// made by professional 3D artists. No procedural / cartoonish "game-style"
// vehicles. All models are bundled locally under models/ with proper
// attribution in models/CREDITS.md.

export const CARS = [
  // ──────────────────────────────────────────────────────────────────
  // Bavarian M3 — BMW M3 E30
  // 3D model by Martin Trafas (Sketchfab user "TinoD2") · CC-BY 4.0
  // https://sketchfab.com/3d-models/free-bmw-m3-e30-ac3c7013434e403e8faff87948caf422
  // ──────────────────────────────────────────────────────────────────
  {
    id: "bmw-m3-e30",
    name: "Bavarian M3 E30",
    inspiredBy: "BMW M3 E30",
    tagline: "موديل ثلاثي الأبعاد فوتوريالستيك حقيقي — عمل Martin Trafas (CC-BY)",
    modelUrl: "models/photoreal/bmw-m3-e30.glb",
    targetLength: 4.4,
    color: 0xeef0f3, accent: 0xc6cdd6, rim: 0x202428,
    photoreal: true,
    power: "238 HP", topSpeed: "243 km/h", zero100: "6.7s",
    engine: {
      label: "I4 2.3L S14 NA",
      type: "I4 NA", cylinders: 2,
      idleRpm: 880, redRpm: 7250,
      fundHz: 75, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.30}, {mult: 4, gain: 0.40},
        {mult: 5, gain: 0.18},
      ],
      crackle: 0.30, grit: 0.45, rumble: 0.45,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [349, 440],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Stuttgart Carrera 4S — Porsche 911 Carrera 4S
  // 3D model by Lionsharp Studios · CC-BY-SA 4.0
  // https://sketchfab.com/3d-models/free-porsche-911-carrera-4s-d01b254483794de3819786d93e0e1ebf
  // ──────────────────────────────────────────────────────────────────
  {
    id: "porsche-carrera",
    name: "Stuttgart Carrera 4S",
    inspiredBy: "Porsche 911 Carrera 4S",
    tagline: "موديل بدقّة عالية لـ Lionsharp Studios — Flat-6 BiTurbo (CC-BY-SA)",
    modelUrl: "models/photoreal/porsche-911-carrera-4s.glb",
    targetLength: 4.5,
    color: 0xefefe9, accent: 0xb0b3b8, rim: 0x202428,
    photoreal: true,
    power: "443 HP", topSpeed: "306 km/h", zero100: "3.4s",
    engine: {
      label: "Flat-6 3.0L BiTurbo",
      type: "Flat-6 Turbo", cylinders: 3,
      idleRpm: 850, redRpm: 7500,
      fundHz: 80, harmonics: [
        {mult: 1, gain: 0.7}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.6}, {mult: 4, gain: 0.45},
        {mult: 6, gain: 0.30}, {mult: 8, gain: 0.18},
      ],
      crackle: 0.25, grit: 0.25, rumble: 0.40,
      turboWhistle: 0.65, blower: 0.0,
      hornFreqs: [466, 587],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Maranello Berlinetta — Ferrari 458 (Three.js demo asset)
  // © Three.js team · MIT
  // ──────────────────────────────────────────────────────────────────
  {
    id: "ferrari-458",
    name: "Maranello Berlinetta",
    inspiredBy: "Ferrari 458",
    tagline: "موديل Three.js examples الأصلي — V8 Flat-plane صارخ (MIT)",
    modelUrl: "models/threejs/ferrari.glb",
    targetLength: 4.55,
    color: 0xc41e2c, accent: 0xffd84d, rim: 0x111111,
    photoreal: true,
    power: "562 HP", topSpeed: "325 km/h", zero100: "3.0s",
    engine: {
      label: "V8 4.5L NA Flat-plane",
      type: "V8 FP", cylinders: 4,
      idleRpm: 980, redRpm: 9000,
      fundHz: 88, harmonics: [
        {mult: 1, gain: 0.55}, {mult: 2, gain: 0.95},
        {mult: 3, gain: 0.65}, {mult: 4, gain: 0.55},
        {mult: 5, gain: 0.30}, {mult: 7, gain: 0.18},
      ],
      crackle: 0.35, grit: 0.20, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Sant'Agata Countach — Lamborghini Countach LPI 800-4 (2021)
  // 3D model by Lexyc16 · CC-BY-NC 4.0  (NON-COMMERCIAL)
  // https://sketchfab.com/3d-models/2021-lamborghini-countach-lpi-800-4-d76b94884432422b966d1a7f8815afb5
  // ──────────────────────────────────────────────────────────────────
  {
    id: "lambo-countach",
    name: "Sant'Agata Countach LPI",
    inspiredBy: "Lamborghini Countach LPI 800-4",
    tagline: "موديل Lexyc16 — V12 NA scream (CC-BY-NC، استخدام شخصي/تعليمي)",
    modelUrl: "models/photoreal/lambo-countach.glb",
    targetLength: 4.85,
    color: 0xfb9b00, accent: 0x111111, rim: 0x111111,
    photoreal: true,
    power: "780 HP", topSpeed: "355 km/h", zero100: "2.8s",
    engine: {
      label: "V12 6.5L NA",
      type: "V12", cylinders: 6,
      idleRpm: 950, redRpm: 8800,
      fundHz: 95, harmonics: [
        {mult: 1, gain: 0.7}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.65}, {mult: 4, gain: 0.55},
        {mult: 5, gain: 0.40}, {mult: 6, gain: 0.30},
        {mult: 8, gain: 0.18},
      ],
      crackle: 0.18, grit: 0.20, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [415, 523],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Concept W16 — Khronos CarConcept demo asset · CC-BY 4.0
  // https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/README.md
  // ──────────────────────────────────────────────────────────────────
  {
    id: "concept-w16",
    name: "Concept W16 Quad-Turbo",
    inspiredBy: "Bugatti-style hypercar — Khronos CarConcept",
    tagline: "موديل Khronos الرسمي — W16 quad-turbo فوتوريالستيك (CC-BY)",
    modelUrl: "models/khronos/CarConcept.glb",
    targetLength: 4.7,
    color: 0x0f1830, accent: 0x4a90e2, rim: 0x4a90e2,
    photoreal: true,
    power: "1500 HP", topSpeed: "440 km/h", zero100: "2.4s",
    engine: {
      label: "W16 8.0L Quad-Turbo",
      type: "W16", cylinders: 8,
      idleRpm: 900, redRpm: 6900,
      fundHz: 110, harmonics: [
        {mult: 1, gain: 0.9}, {mult: 2, gain: 0.75},
        {mult: 3, gain: 0.55}, {mult: 4, gain: 0.45},
        {mult: 6, gain: 0.30}, {mult: 8, gain: 0.20},
      ],
      crackle: 0.25, grit: 0.20, rumble: 0.55,
      turboWhistle: 0.95, blower: 0.0,
      hornFreqs: [440, 554],
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Khronos ToyCar — high-detail toy-car GLB · CC-BY 4.0
  // https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/ToyCar/README.md
  // ──────────────────────────────────────────────────────────────────
  {
    id: "toy-car",
    name: "Pixar Toy Car",
    inspiredBy: "Pixar 'Toy Car' demo asset",
    tagline: "موديل Khronos الرسمي مع تفاصيل MaterialsX (CC-BY)",
    modelUrl: "models/khronos/ToyCar.glb",
    targetLength: 4.0,
    color: 0xd92020, accent: 0xfff200, rim: 0x202428,
    photoreal: true,
    power: "—", topSpeed: "—", zero100: "—",
    engine: {
      label: "Imaginary I4 Petrol",
      type: "I4", cylinders: 2,
      idleRpm: 800, redRpm: 6500,
      fundHz: 65, harmonics: [
        {mult: 1, gain: 0.85}, {mult: 2, gain: 0.45},
        {mult: 3, gain: 0.20}, {mult: 4, gain: 0.15},
      ],
      crackle: 0.10, grit: 0.30, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [392, 494],
    },
  },
];
