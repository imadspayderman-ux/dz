// Car catalog. Each car has visual styling + a detailed engine profile that
// drives the procedural audio synthesis for an "authentic" engine signature.
//
// Engine profile fields:
//   type           : visual label (V8, V12, I4 turbo, ...)
//   cylinders      : firing pulses per crank revolution (V8=4, V12=6, ...)
//   idleRpm/redRpm : operating range
//   fundHz         : audible base frequency at idle
//   harmonics      : list of {mult, gain} partials shaping the engine timbre
//   crackle        : random pop/crackle on overrun (0..1)
//   grit           : low-end roughness/noise mix (0..1)
//   rumble         : sub-bass amount (0..1)
//   turboWhistle   : how loud the spool whistle gets under boost (0..1)
//   blower         : supercharger whine amount (0..1)
//   electric       : >0 means electric whine instead of combustion
//   hornFreqs      : two-tone horn frequencies in Hz

export const CARS = [
  {
    id: "crimson-fury",
    name: "Crimson Fury GT",
    tagline: "American V8 muscle, deep & angry",
    body: "muscle",
    color: 0xb40c1c, accent: 0x111111, rim: 0x222222,
    power: "650 HP", topSpeed: "320 km/h", zero100: "3.5s",
    spoiler: "duck",
    engine: {
      label: "V8 6.2L",
      type: "V8", cylinders: 4,
      idleRpm: 750, redRpm: 7200,
      fundHz: 55, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.30}, {mult: 4, gain: 0.40},
        {mult: 5, gain: 0.18}, {mult: 6, gain: 0.22},
      ],
      crackle: 0.45, grit: 0.55, rumble: 0.85,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [330, 415],
    }
  },
  {
    id: "azure-arrow",
    name: "Azure Arrow V12",
    tagline: "Italian-style V12 supercar, screaming top end",
    body: "super",
    color: 0x1a3fbd, accent: 0xc8d2e0, rim: 0x303030,
    power: "780 HP", topSpeed: "350 km/h", zero100: "2.9s",
    spoiler: "wing",
    engine: {
      label: "V12 6.5L NA",
      type: "V12", cylinders: 6,
      idleRpm: 950, redRpm: 8800,
      fundHz: 95, harmonics: [
        {mult: 1, gain: 0.7}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.65}, {mult: 4, gain: 0.55},
        {mult: 5, gain: 0.40}, {mult: 6, gain: 0.30}, {mult: 8, gain: 0.18},
      ],
      crackle: 0.18, grit: 0.20, rumble: 0.30,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [440, 554],
    }
  },
  {
    id: "shadow-rs",
    name: "Shadow RS",
    tagline: "Turbo-4 hot hatch with whistle and pops",
    body: "hatch",
    color: 0x111418, accent: 0xff3b3b, rim: 0xff3b3b,
    power: "420 HP", topSpeed: "290 km/h", zero100: "4.0s",
    spoiler: "lip",
    engine: {
      label: "I4 2.0L Turbo",
      type: "I4 Turbo", cylinders: 2,
      idleRpm: 850, redRpm: 7000,
      fundHz: 70, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.25}, {mult: 4, gain: 0.20}, {mult: 5, gain: 0.10},
      ],
      crackle: 0.85, grit: 0.45, rumble: 0.30,
      turboWhistle: 1.0, blower: 0.0,
      hornFreqs: [380, 480],
    }
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    tagline: "V10 exotic with razor sharp throttle",
    body: "super",
    color: 0xffc20a, accent: 0x111111, rim: 0x111111,
    power: "640 HP", topSpeed: "330 km/h", zero100: "3.0s",
    spoiler: "wing",
    engine: {
      label: "V10 5.2L NA",
      type: "V10", cylinders: 5,
      idleRpm: 900, redRpm: 8500,
      fundHz: 80, harmonics: [
        {mult: 1, gain: 0.85}, {mult: 2, gain: 0.7},
        {mult: 3, gain: 0.55}, {mult: 5, gain: 0.40}, {mult: 7, gain: 0.18},
      ],
      crackle: 0.35, grit: 0.30, rumble: 0.45,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [415, 523],
    }
  },
  {
    id: "ion-zero",
    name: "Ion Zero EV",
    tagline: "Electric hyper-sedan with regenerative whine",
    body: "sedan",
    color: 0xeef2f7, accent: 0x223344, rim: 0x101010,
    power: "1020 HP", topSpeed: "340 km/h", zero100: "2.1s",
    spoiler: "lip",
    engine: {
      label: "Tri-Motor EV",
      type: "EV", cylinders: 0,
      idleRpm: 0, redRpm: 18000,
      fundHz: 220, harmonics: [
        {mult: 1, gain: 0.4}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.6}, {mult: 4, gain: 0.5},
      ],
      crackle: 0.0, grit: 0.05, rumble: 0.0,
      turboWhistle: 0.0, blower: 0.0,
      electric: 1.0,
      hornFreqs: [493, 622],
    }
  },
  {
    id: "verde-spider",
    name: "Verde Spider",
    tagline: "Smooth I6 roadster, vintage cool",
    body: "roadster",
    color: 0x1f7a3a, accent: 0xd6c47a, rim: 0xd6c47a,
    power: "380 HP", topSpeed: "270 km/h", zero100: "4.4s",
    spoiler: "none",
    engine: {
      label: "I6 3.0L NA",
      type: "I6", cylinders: 3,
      idleRpm: 800, redRpm: 7400,
      fundHz: 70, harmonics: [
        {mult: 1, gain: 0.8}, {mult: 2, gain: 0.6},
        {mult: 3, gain: 0.45}, {mult: 4, gain: 0.30}, {mult: 6, gain: 0.20},
      ],
      crackle: 0.10, grit: 0.20, rumble: 0.40,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [349, 440],
    }
  },
  {
    id: "rally-x",
    name: "Rally-X Boxer",
    tagline: "Flat-4 turbo with that unmistakable boxer rumble",
    body: "wagon",
    color: 0xf26430, accent: 0x0a0a0a, rim: 0x0066cc,
    power: "350 HP", topSpeed: "260 km/h", zero100: "4.6s",
    spoiler: "wing",
    engine: {
      label: "H4 2.5L Turbo",
      type: "Boxer 4", cylinders: 2,
      idleRpm: 820, redRpm: 6800,
      fundHz: 60, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 1.5, gain: 0.45},
        {mult: 2, gain: 0.55}, {mult: 3, gain: 0.30}, {mult: 4, gain: 0.18},
      ],
      crackle: 0.7, grit: 0.6, rumble: 0.55,
      turboWhistle: 0.85, blower: 0.0,
      hornFreqs: [392, 494],
    }
  },
  {
    id: "silver-line",
    name: "Silverline V6",
    tagline: "Balanced executive sport sedan",
    body: "sedan",
    color: 0xb8c0c8, accent: 0x222222, rim: 0x202020,
    power: "400 HP", topSpeed: "280 km/h", zero100: "4.2s",
    spoiler: "lip",
    engine: {
      label: "V6 3.0L Bi-Turbo",
      type: "V6 Turbo", cylinders: 3,
      idleRpm: 800, redRpm: 7000,
      fundHz: 75, harmonics: [
        {mult: 1, gain: 0.8}, {mult: 2, gain: 0.55},
        {mult: 3, gain: 0.45}, {mult: 4, gain: 0.30}, {mult: 5, gain: 0.20},
      ],
      crackle: 0.30, grit: 0.30, rumble: 0.45,
      turboWhistle: 0.65, blower: 0.0,
      hornFreqs: [370, 466],
    }
  },
  {
    id: "scarlet-track",
    name: "Scarlet Track-R",
    tagline: "Flat-plane V8 race car howl",
    body: "super",
    color: 0xd92020, accent: 0x000000, rim: 0xfff200,
    power: "720 HP", topSpeed: "340 km/h", zero100: "2.8s",
    spoiler: "wing",
    engine: {
      label: "V8 5.2L Flat-plane",
      type: "V8 FP", cylinders: 4,
      idleRpm: 900, redRpm: 8200,
      fundHz: 80, harmonics: [
        {mult: 1, gain: 0.7}, {mult: 2, gain: 0.85},
        {mult: 3, gain: 0.6}, {mult: 4, gain: 0.5}, {mult: 5, gain: 0.35}, {mult: 7, gain: 0.20},
      ],
      crackle: 0.40, grit: 0.30, rumble: 0.40,
      turboWhistle: 0.0, blower: 0.0,
      hornFreqs: [466, 587],
    }
  },
  {
    id: "purple-haze",
    name: "Purple Haze SC",
    tagline: "Supercharged V8 drag monster",
    body: "muscle",
    color: 0x6f2bd9, accent: 0x000000, rim: 0xc0c0c0,
    power: "850 HP", topSpeed: "330 km/h", zero100: "3.1s",
    spoiler: "duck",
    engine: {
      label: "V8 6.2L Supercharged",
      type: "V8 SC", cylinders: 4,
      idleRpm: 800, redRpm: 7000,
      fundHz: 60, harmonics: [
        {mult: 1, gain: 1.0}, {mult: 2, gain: 0.6},
        {mult: 3, gain: 0.30}, {mult: 4, gain: 0.50}, {mult: 5, gain: 0.20},
      ],
      crackle: 0.30, grit: 0.55, rumble: 0.95,
      turboWhistle: 0.0, blower: 1.0,
      hornFreqs: [311, 392],
    }
  },
  {
    id: "stealth-12",
    name: "Stealth 12 TT",
    tagline: "Twin-turbo V12 grand tourer",
    body: "gt",
    color: 0x18181c, accent: 0x9aa1ad, rim: 0x303030,
    power: "830 HP", topSpeed: "345 km/h", zero100: "2.7s",
    spoiler: "active",
    engine: {
      label: "V12 6.0L Bi-Turbo",
      type: "V12 TT", cylinders: 6,
      idleRpm: 850, redRpm: 7400,
      fundHz: 90, harmonics: [
        {mult: 1, gain: 0.85}, {mult: 2, gain: 0.65},
        {mult: 3, gain: 0.55}, {mult: 4, gain: 0.40}, {mult: 6, gain: 0.25},
      ],
      crackle: 0.20, grit: 0.20, rumble: 0.50,
      turboWhistle: 0.7, blower: 0.0,
      hornFreqs: [415, 523],
    }
  },
  {
    id: "carbon-w16",
    name: "Carbon Reign W16",
    tagline: "Quad-turbo W16 hypercar, engineering symphony",
    body: "hyper",
    color: 0x0a0a0a, accent: 0x2a3140, rim: 0x4a90e2,
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
    }
  },
];
