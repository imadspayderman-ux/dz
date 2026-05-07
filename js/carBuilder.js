// Procedural 3D car builder using extruded side-profile silhouettes,
// with brand-evocative grille / wheel / headlight styles. Each spec
// declares a body profile, grille, wheels, and headlights treatment so
// cars styled after Audi RS6 vs VW Beetle vs BMW M3 vs Porsche 911 etc.
// look distinct.

import * as THREE from "three";

// ---------- shared materials cache ----------
const _matCache = {};
function paintMat(color) {
  const k = "p" + color;
  if (_matCache[k]) return _matCache[k];
  return (_matCache[k] = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.55, roughness: 0.32,
    clearcoat: 0.9, clearcoatRoughness: 0.08,
  }));
}
function chromeMat(color = 0xc6cdd6) {
  const k = "c" + color;
  if (_matCache[k]) return _matCache[k];
  return (_matCache[k] = new THREE.MeshStandardMaterial({
    color, metalness: 1.0, roughness: 0.2,
  }));
}
function rubberMat() {
  if (!_matCache._rub) {
    _matCache._rub = new THREE.MeshStandardMaterial({
      color: 0x0d0e10, metalness: 0.1, roughness: 0.95,
    });
  }
  return _matCache._rub;
}
function plasticMat(color = 0x101216) {
  const k = "pl" + color;
  if (_matCache[k]) return _matCache[k];
  return (_matCache[k] = new THREE.MeshStandardMaterial({
    color, metalness: 0.2, roughness: 0.75,
  }));
}
function glassMat() {
  if (!_matCache._glass) {
    _matCache._glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10, metalness: 0.6, roughness: 0.05,
      transparent: true, opacity: 0.85,
      clearcoat: 1.0, clearcoatRoughness: 0.0,
    });
  }
  return _matCache._glass;
}
function emissiveMat(color, intensity = 1.1) {
  return new THREE.MeshStandardMaterial({
    color: 0xfff5d0, emissive: color, emissiveIntensity: intensity,
    metalness: 0.4, roughness: 0.2,
  });
}

// ---------- Body silhouette parameters per body type ----------
const BODY_PROFILES = {
  super: {
    L: 4.55, W: 2.00, floorY: 0.32, beltY: 0.78, roofY: 1.10, frontH: 0.62, rearH: 0.62,
    cowlX: 0.30, roofFrontX: 0.05, roofRearX: -0.55, deckX: -0.85, trunkRearX: -1.55,
    wheelbase: 2.7, wheelR: 0.42, frontOverhang: 0.85, rearOverhang: 1.0,
  },
  // Front-engine V8 GT (AMG GT, Ferrari Roma)
  amg: {
    L: 4.70, W: 1.96, floorY: 0.34, beltY: 0.78, roofY: 1.18, frontH: 0.62, rearH: 0.66,
    cowlX: -0.10, roofFrontX: -0.30, roofRearX: -0.85, deckX: -1.15, trunkRearX: -1.85,
    wheelbase: 2.65, wheelR: 0.43, frontOverhang: 1.30, rearOverhang: 0.75,
  },
  // BMW M3 sedan (G80) with sweeping greenhouse and short rear deck
  m3sedan: {
    L: 4.80, W: 1.92, floorY: 0.34, beltY: 0.86, roofY: 1.32, frontH: 0.66, rearH: 0.74,
    cowlX: 0.55, roofFrontX: 0.30, roofRearX: -0.55, deckX: -0.95, trunkRearX: -1.85,
    wheelbase: 2.85, wheelR: 0.42, frontOverhang: 0.85, rearOverhang: 1.10,
  },
  // Audi RS6 Avant — wagon roofline, square rear, long shoulders
  avant: {
    L: 4.95, W: 1.95, floorY: 0.34, beltY: 0.86, roofY: 1.40, frontH: 0.66, rearH: 0.92,
    cowlX: 0.55, roofFrontX: 0.30, roofRearX: -1.40, deckX: -1.55, trunkRearX: -1.95,
    wheelbase: 2.95, wheelR: 0.43, frontOverhang: 0.95, rearOverhang: 1.05,
  },
  // VW Golf GTI hatch
  gti: {
    L: 4.30, W: 1.85, floorY: 0.34, beltY: 0.92, roofY: 1.45, frontH: 0.70, rearH: 0.92,
    cowlX: 0.45, roofFrontX: 0.20, roofRearX: -0.95, deckX: -1.05, trunkRearX: -1.55,
    wheelbase: 2.65, wheelR: 0.40, frontOverhang: 0.85, rearOverhang: 0.80,
  },
  // VW Beetle — short, very rounded
  bug: {
    L: 4.00, W: 1.78, floorY: 0.34, beltY: 0.85, roofY: 1.40, frontH: 0.70, rearH: 0.70,
    cowlX: 0.95, roofFrontX: 0.55, roofRearX: -0.40, deckX: -0.80, trunkRearX: -1.55,
    wheelbase: 2.40, wheelR: 0.36, frontOverhang: 0.70, rearOverhang: 0.85,
  },
  // Porsche 911 — rear engine, fastback to rear, raised rear haunch
  p911: {
    L: 4.55, W: 1.90, floorY: 0.34, beltY: 0.82, roofY: 1.20, frontH: 0.62, rearH: 0.78,
    cowlX: 0.55, roofFrontX: 0.30, roofRearX: -0.30, deckX: -1.45, trunkRearX: -1.85,
    wheelbase: 2.45, wheelR: 0.40, frontOverhang: 1.05, rearOverhang: 1.05,
  },
  // Mid-engine super (R8 / Huracan / 488)
  midEngine: {
    L: 4.55, W: 2.05, floorY: 0.32, beltY: 0.78, roofY: 1.06, frontH: 0.58, rearH: 0.74,
    cowlX: 0.20, roofFrontX: -0.05, roofRearX: -0.55, deckX: -0.95, trunkRearX: -1.65,
    wheelbase: 2.70, wheelR: 0.42, frontOverhang: 0.80, rearOverhang: 1.05,
  },
  // Nissan GT-R — angular, wide-shoulder coupe
  gtr: {
    L: 4.70, W: 1.98, floorY: 0.34, beltY: 0.85, roofY: 1.30, frontH: 0.66, rearH: 0.78,
    cowlX: 0.55, roofFrontX: 0.30, roofRearX: -0.55, deckX: -0.95, trunkRearX: -1.85,
    wheelbase: 2.78, wheelR: 0.42, frontOverhang: 0.85, rearOverhang: 1.05,
  },
  sedan: {
    L: 4.90, W: 1.92, floorY: 0.36, beltY: 0.92, roofY: 1.40, frontH: 0.70, rearH: 0.78,
    cowlX: 0.50, roofFrontX: 0.30, roofRearX: -0.55, deckX: -0.95, trunkRearX: -1.95,
    wheelbase: 2.95, wheelR: 0.42, frontOverhang: 0.90, rearOverhang: 1.05,
  },
  hyper: {
    L: 4.55, W: 2.05, floorY: 0.32, beltY: 0.78, roofY: 1.05, frontH: 0.58, rearH: 0.70,
    cowlX: 0.10, roofFrontX: -0.10, roofRearX: -0.55, deckX: -0.80, trunkRearX: -1.65,
    wheelbase: 2.70, wheelR: 0.42, frontOverhang: 0.85, rearOverhang: 1.0,
  },
};

// Build a closed THREE.Shape for the car side profile.
function buildBodyShape(p) {
  const fX = p.L / 2, rX = -p.L / 2;
  const s = new THREE.Shape();
  s.moveTo(fX, p.floorY);
  s.lineTo(fX, p.frontH);
  s.quadraticCurveTo(fX - 0.05, p.beltY - 0.05, fX - 0.20, p.beltY);
  s.lineTo(p.cowlX, p.beltY);
  s.quadraticCurveTo(p.cowlX - 0.20, p.beltY + 0.05, p.roofFrontX, p.roofY);
  s.lineTo(p.roofRearX, p.roofY);
  s.quadraticCurveTo(p.roofRearX - 0.30, p.beltY + 0.10, p.deckX, p.beltY);
  s.lineTo(p.trunkRearX, p.beltY);
  s.quadraticCurveTo(rX + 0.05, p.beltY - 0.05, rX, p.rearH);
  s.lineTo(rX, p.floorY);
  s.lineTo(fX, p.floorY);
  return s;
}

function buildGreenhouseShape(p) {
  const s = new THREE.Shape();
  s.moveTo(p.cowlX, p.beltY);
  s.quadraticCurveTo(p.cowlX - 0.20, p.beltY + 0.05, p.roofFrontX, p.roofY);
  s.lineTo(p.roofRearX, p.roofY);
  s.quadraticCurveTo(p.roofRearX - 0.30, p.beltY + 0.10, p.deckX, p.beltY);
  s.lineTo(p.cowlX, p.beltY);
  return s;
}

function extrudeBody(shape, depth, bevel = 0.04) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 14,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ─── Wheel styles per brand ──────────────────────────────────────────────
// Different spoke counts and patterns convey different brands.
const WHEEL_STYLES = {
  // Audi 5-split (V-shaped twin spokes)
  "audi-5split":      { spokes: 5, twin: true,  twinAngle: 0.10, hubColor: 0x1c1e22 },
  "vw-12spoke":       { spokes: 12, twin: false, hubColor: 0x18191c },
  "vw-classic":       { spokes: 4, twin: false, hubColor: 0x808080 },
  "bmw-10spoke":      { spokes: 10, twin: false, hubColor: 0x111114 },
  "porsche-turbofan": { spokes: 5, twin: true,  twinAngle: 0.0, dish: true, hubColor: 0x0a0a0a },
  "ferrari-twin5":    { spokes: 5, twin: true,  twinAngle: 0.18, hubColor: 0x0a0a0a },
  "lambo-arrow":      { spokes: 5, twin: false, arrowy: true, hubColor: 0x0a0a0a },
  "amg-cross":        { spokes: 6, twin: true,  twinAngle: 0.05, hubColor: 0x101216 },
  "nissan-rays":      { spokes: 6, twin: true,  twinAngle: 0.12, hubColor: 0x0a0a0a },
  "ev-aero":          { spokes: 5, twin: false, dish: true, hubColor: 0x18191e },
  "default":          { spokes: 5, twin: false, hubColor: 0x1a1c20 },
};

function makeWheel(radius, width, rimColor, accentColor, styleKey) {
  const wheel = new THREE.Group();
  const spinner = new THREE.Group();
  wheel.add(spinner);
  wheel.userData.spinner = spinner;
  const style = WHEEL_STYLES[styleKey] || WHEEL_STYLES.default;

  // tire
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 28),
    rubberMat()
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  spinner.add(tire);

  const sideWall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, width + 0.002, 28),
    new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.95, metalness: 0.05 })
  );
  sideWall.rotation.z = Math.PI / 2;
  spinner.add(sideWall);

  // brake disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.35 })
  );
  disc.rotation.z = Math.PI / 2;
  spinner.add(disc);

  // outer rim face
  const rimFace = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.18, radius * 0.78, 28),
    new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.9, roughness: 0.25 })
  );
  rimFace.rotation.y = Math.PI / 2;
  rimFace.position.x = width / 2 + 0.005;
  spinner.add(rimFace);

  // Spokes — solid bars from hub outward, with optional twin pairing.
  const N = style.spokes || 5;
  const armLen = radius * 1.45;
  const armW   = style.dish ? 0.022 : (style.arrowy ? 0.05 : 0.035);
  const armGeo = new THREE.BoxGeometry(width * 0.55, armLen, armW);
  for (let i = 0; i < N; i++) {
    const baseAngle = (i / N) * Math.PI * 2;
    const offsets = style.twin ? [-(style.twinAngle || 0.1), +(style.twinAngle || 0.1)] : [0];
    for (const o of offsets) {
      const arm = new THREE.Mesh(armGeo, chromeMat(rimColor));
      arm.rotation.x = baseAngle + o;
      arm.position.x = -width * 0.05;
      spinner.add(arm);
    }
  }

  // central hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width * 0.85, 16),
    chromeMat(style.hubColor || 0x1c1e22)
  );
  hub.rotation.z = Math.PI / 2;
  spinner.add(hub);

  // brake caliper (does NOT spin)
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.55, radius * 0.5, radius * 0.42),
    new THREE.MeshStandardMaterial({ color: accentColor || 0xff2d2d, metalness: 0.5, roughness: 0.45 })
  );
  caliper.position.y = radius * 0.45;
  wheel.add(caliper);

  return wheel;
}

// ─── Brand-specific grilles ──────────────────────────────────────────────
function buildGrille(style, p, accent) {
  const g = new THREE.Group();
  const fxSurface = p.L / 2 + 0.001;
  const yBase = p.frontH;
  const yTop = p.beltY;
  switch (style) {
    case "audi-singleframe": {
      // Big single-frame trapezoid with vertical bars
      const w = p.W * 0.62, h = (yTop - yBase) + 0.22;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, h, w),
        plasticMat(0x05070a)
      );
      frame.position.set(fxSurface - 0.01, (yBase + yTop) / 2 - 0.05, 0);
      g.add(frame);
      // chrome border
      for (const sgn of [-1, 1]) {
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, h, 0.02),
          chromeMat(accent)
        );
        side.position.set(fxSurface + 0.01, (yBase + yTop) / 2 - 0.05, sgn * w / 2);
        g.add(side);
      }
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.025, w),
        chromeMat(accent)
      );
      top.position.set(fxSurface + 0.01, yTop - 0.015, 0);
      g.add(top);
      // vertical bars
      const N = 14;
      for (let i = 0; i < N; i++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, h * 0.95, 0.012),
          chromeMat(0x2a2c30)
        );
        bar.position.set(fxSurface, (yBase + yTop) / 2 - 0.05, ((i + 0.5) / N - 0.5) * w);
        g.add(bar);
      }
      break;
    }
    case "bmw-kidney": {
      // Twin kidney shapes (vertical pill)
      const kidneyH = (yTop - yBase) + 0.18;
      const kidneyW = p.W * 0.16;
      for (const sgn of [-1, 1]) {
        const k = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, kidneyH, kidneyW),
          plasticMat(0x05070a)
        );
        k.position.set(fxSurface - 0.005, (yBase + yTop) / 2, sgn * (p.W * 0.1));
        g.add(k);
        // chrome border
        const bord = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, kidneyH + 0.02, 0.02),
          chromeMat(accent)
        );
        for (const z of [sgn * (p.W * 0.1 - kidneyW / 2), sgn * (p.W * 0.1 + kidneyW / 2)]) {
          const c = bord.clone();
          c.position.set(fxSurface + 0.005, (yBase + yTop) / 2, z);
          g.add(c);
        }
        // vertical slats
        for (let i = 0; i < 6; i++) {
          const slat = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, kidneyH * 0.95, 0.008),
            chromeMat(0x2a2c30)
          );
          slat.position.set(fxSurface, (yBase + yTop) / 2, sgn * (p.W * 0.1) + ((i + 0.5) / 6 - 0.5) * kidneyW);
          g.add(slat);
        }
      }
      break;
    }
    case "vw-honeycomb": {
      // Wide low rectangle with red accent strip and honeycomb
      const w = p.W * 0.74, h = (yTop - yBase) - 0.05;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, h, w),
        plasticMat(0x05070a)
      );
      frame.position.set(fxSurface - 0.005, yBase + h / 2 - 0.02, 0);
      g.add(frame);
      // GTI red strip across the top
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, p.W * 0.78),
        new THREE.MeshStandardMaterial({ color: 0xd0182b, emissive: 0x500a10, emissiveIntensity: 0.4 })
      );
      strip.position.set(fxSurface + 0.01, yTop - 0.04, 0);
      g.add(strip);
      // honeycomb dots
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 14; col++) {
          const off = (row % 2) * 0.5;
          const dot = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.025, 0.025),
            chromeMat(0x303236)
          );
          dot.position.set(
            fxSurface + 0.005,
            yBase + 0.02 + (row + 0.5) * h / 4,
            ((col + off + 0.5) / 14 - 0.5) * w
          );
          g.add(dot);
        }
      }
      break;
    }
    case "amg-mesh": {
      // Wide rectangular mesh with central star plinth (Mercedes-AMG)
      const w = p.W * 0.70, h = (yTop - yBase) + 0.10;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, h, w),
        plasticMat(0x05070a)
      );
      frame.position.set(fxSurface - 0.005, yBase + h / 2 - 0.05, 0);
      g.add(frame);
      // diamond mesh: a few rows of small tilted boxes
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 18; col++) {
          const off = (row % 2) * 0.5;
          const dot = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.018, 0.018),
            chromeMat(0x202428)
          );
          dot.position.set(
            fxSurface + 0.005,
            yBase + 0.02 + (row + 0.5) * h / 5 - 0.05,
            ((col + off + 0.5) / 18 - 0.5) * w
          );
          dot.rotation.x = Math.PI / 4;
          g.add(dot);
        }
      }
      break;
    }
    case "ferrari-cross": {
      // Two side intakes flanking a center body-color section
      for (const sgn of [-1, 1]) {
        const intake = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, (yTop - yBase) * 0.8, p.W * 0.22),
          plasticMat(0x040608)
        );
        intake.position.set(fxSurface - 0.005, yBase + (yTop - yBase) * 0.4 - 0.04, sgn * p.W * 0.22);
        g.add(intake);
      }
      // central horizontal slot
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, p.W * 0.30),
        plasticMat(0x080a0d)
      );
      slot.position.set(fxSurface, yBase + 0.02, 0);
      g.add(slot);
      break;
    }
    case "lambo-y": {
      // Aggressive Y-shape — three angular slits
      const w = p.W * 0.60, h = (yTop - yBase) - 0.05;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, h, w),
        plasticMat(0x040608)
      );
      frame.position.set(fxSurface - 0.005, yBase + h / 2 - 0.02, 0);
      g.add(frame);
      // diagonal slats
      for (let i = -3; i <= 3; i++) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, h * 0.95, 0.018),
          chromeMat(0x303236)
        );
        slat.position.set(fxSurface + 0.005, yBase + h / 2 - 0.02, (i / 3) * w * 0.5);
        slat.rotation.x = 0.18;
        g.add(slat);
      }
      break;
    }
    case "nissan-v": {
      // V-shaped grille opening with mesh
      const w = p.W * 0.58, h = (yTop - yBase) + 0.05;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, h, w),
        plasticMat(0x040608)
      );
      frame.position.set(fxSurface - 0.005, yBase + h / 2 - 0.02, 0);
      g.add(frame);
      // V chrome
      const vL = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, w * 0.55),
        chromeMat(accent)
      );
      vL.position.set(fxSurface + 0.005, yBase + h / 2 + 0.01, 0);
      vL.rotation.x = 0.25;
      g.add(vL);
      const vR = vL.clone();
      vR.rotation.x = -0.25;
      vR.position.y = yBase + h / 2 - 0.07;
      g.add(vR);
      break;
    }
    case "bugatti-horseshoe": {
      // Iconic horseshoe (vertical oval)
      const w = p.W * 0.32, h = (yTop - yBase) + 0.18;
      const frame = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 32, 1, false, -Math.PI / 2, Math.PI),
        plasticMat(0x040608)
      );
      frame.rotation.z = Math.PI / 2;
      frame.position.set(fxSurface - 0.005, yBase + h / 2 - 0.05, 0);
      frame.scale.y = h / w;
      g.add(frame);
      // chrome border
      const chrome = new THREE.Mesh(
        new THREE.TorusGeometry(w / 2, 0.02, 8, 32, Math.PI),
        chromeMat(accent)
      );
      chrome.position.set(fxSurface + 0.01, yBase + h / 2 - 0.05, 0);
      chrome.rotation.y = Math.PI / 2;
      chrome.scale.y = h / w;
      g.add(chrome);
      break;
    }
    case "ev-flat": {
      // EV — basically no grille, just a body-color front panel
      const slim = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, p.W * 0.5),
        plasticMat(0x111418)
      );
      slim.position.set(fxSurface, yBase + 0.04, 0);
      g.add(slim);
      break;
    }
    case "none":
    default: {
      // Simple bumper opening
      const slim = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.10, p.W * 0.45),
        plasticMat(0x07090c)
      );
      slim.position.set(fxSurface, yBase + 0.06, 0);
      g.add(slim);
    }
  }
  return g;
}

// ─── Brand-specific headlight signatures ────────────────────────────────
function buildHeadlights(style, p) {
  const lights = [];
  const fX = p.L / 2 - 0.02;
  const y = p.beltY - 0.08;
  switch (style) {
    case "round": {
      // Classic round headlights (Beetle, 911)
      for (const sgn of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI),
          emissiveMat(0xfff3c8, 1.4)
        );
        m.rotation.y = -Math.PI / 2;
        m.position.set(fX + 0.03, y, sgn * (p.W / 2 - 0.40));
        lights.push(m);
      }
      break;
    }
    case "audi-led-strip": {
      for (const sgn of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.08, 0.55),
          emissiveMat(0xfff5d0, 1.3)
        );
        m.position.set(fX, y - 0.02, sgn * (p.W / 2 - 0.40));
        lights.push(m);
        // signature DRL strip (slim line below)
        const drl = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.02, 0.5),
          emissiveMat(0xb8e0ff, 1.6)
        );
        drl.position.set(fX + 0.01, y - 0.10, sgn * (p.W / 2 - 0.40));
        lights.push(drl);
      }
      break;
    }
    case "bmw-laser": {
      for (const sgn of [-1, 1]) {
        // L-shaped LED (twin halo accent)
        const main = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.10, 0.55),
          emissiveMat(0xffffff, 1.4)
        );
        main.position.set(fX, y, sgn * (p.W / 2 - 0.40));
        lights.push(main);
        const halo = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.50),
          emissiveMat(0x9ec8ff, 1.8)
        );
        halo.position.set(fX + 0.005, y + 0.06, sgn * (p.W / 2 - 0.40));
        lights.push(halo);
      }
      break;
    }
    case "vw-square": {
      for (const sgn of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.10, 0.45),
          emissiveMat(0xfff5d0, 1.2)
        );
        m.position.set(fX, y - 0.02, sgn * (p.W / 2 - 0.40));
        lights.push(m);
      }
      break;
    }
    case "twin-circle": {
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const m = new THREE.Mesh(
            new THREE.CircleGeometry(0.07, 14),
            emissiveMat(0xfff5d0, 1.3)
          );
          m.rotation.y = -Math.PI / 2;
          m.position.set(fX + 0.005, y - 0.02, sgn * (p.W / 2 - 0.32 - i * 0.18));
          lights.push(m);
        }
      }
      break;
    }
    case "slant-led":
    case "y-led":
    case "slim-led":
    default: {
      for (const sgn of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.06, 0.52),
          emissiveMat(0xfff5d0, 1.2)
        );
        m.position.set(fX, y - 0.02, sgn * (p.W / 2 - 0.40));
        if (style === "slant-led") m.rotation.x = 0.18;
        if (style === "y-led") m.rotation.x = -0.20;
        lights.push(m);
      }
      break;
    }
  }
  return lights;
}

export function buildCar(spec) {
  const car = new THREE.Group();
  car.name = spec.id;
  const profileKey = spec.body in BODY_PROFILES ? spec.body : "sedan";
  const p = { ...BODY_PROFILES[profileKey] };

  // ---- main body ----
  const bodyShape = buildBodyShape(p);
  const bodyGeo = extrudeBody(bodyShape, p.W - 0.04, 0.05);
  const body = new THREE.Mesh(bodyGeo, paintMat(spec.color));
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  // ---- greenhouse / glass canopy ----
  const greenShape = buildGreenhouseShape(p);
  const greenGeo = extrudeBody(greenShape, p.W * 0.86, 0.02);
  const green = new THREE.Mesh(greenGeo, glassMat());
  car.add(green);

  // belt-line trim
  for (const sgn of [-1, 1]) {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(p.L * 0.85, 0.025, 0.02),
      chromeMat(spec.accent || 0xc6cdd6)
    );
    trim.position.set(0, p.beltY - 0.02, sgn * (p.W / 2 - 0.01));
    car.add(trim);
  }

  // ---- brand-specific grille ----
  car.add(buildGrille(spec.grille || "none", p, spec.accent || 0xc6cdd6));

  // ---- brand-specific headlights ----
  const headlights = buildHeadlights(spec.headlights || "slim-led", p);
  for (const h of headlights) {
    h.userData.headlight = true;
    car.add(h);
  }

  // ---- taillights ----
  for (const sgn of [-1, 1]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.10, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x4a0606, emissive: 0xff1010,
        emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.4,
      })
    );
    tail.position.set(-p.L / 2 + 0.01, p.beltY - 0.10, sgn * (p.W / 2 - 0.45));
    car.add(tail);
    tail.userData.taillight = true;
  }

  // ---- side mirrors ----
  for (const sgn of [-1, 1]) {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.10, 0.10),
      paintMat(spec.color)
    );
    mirror.position.set(p.cowlX - 0.05, p.beltY + 0.02, sgn * (p.W / 2 + 0.04));
    car.add(mirror);
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.06),
      plasticMat(0x101216)
    );
    stem.position.set(p.cowlX - 0.05, p.beltY - 0.02, sgn * (p.W / 2 - 0.01));
    car.add(stem);
  }

  // ---- exhaust tips ----
  if (!(spec.engine && spec.engine.electric)) {
    const tipCount = (spec.engine && (spec.engine.cylinders >= 4)) ? 2 : 1;
    for (const sgn of (tipCount === 2 ? [-1, 1] : [0])) {
      const ex = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.075, 0.18, 14),
        chromeMat(0xb6bdc6)
      );
      ex.rotation.z = Math.PI / 2;
      ex.position.set(-p.L / 2 - 0.05, p.frontH - 0.18, sgn * 0.45);
      car.add(ex);
    }
  }

  // ---- splitter & diffuser ----
  car.add(Object.assign(new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.04, p.W * 0.92),
    plasticMat(0x06070a)
  ), { position: new THREE.Vector3(p.L / 2 - 0.16, p.floorY - 0.02, 0) }));
  car.add(Object.assign(new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.06, p.W * 0.85),
    plasticMat(0x06070a)
  ), { position: new THREE.Vector3(-p.L / 2 + 0.18, p.floorY - 0.01, 0) }));

  // ---- spoiler ----
  if (spec.spoiler === "lip") {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.04, p.W * 0.9),
      paintMat(spec.color)
    );
    lip.position.set(-p.L / 2 + 0.06, p.beltY + 0.02, 0);
    lip.rotation.z = -0.1;
    car.add(lip);
  } else if (spec.spoiler === "duck") {
    const d = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.10, p.W * 0.92),
      paintMat(spec.color)
    );
    d.position.set(-p.L / 2 + 0.14, p.beltY + 0.10, 0);
    d.rotation.z = -0.18;
    car.add(d);
  } else if (spec.spoiler === "wing" || spec.spoiler === "active") {
    const sup1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.04), plasticMat(0x101216)
    );
    sup1.position.set(-p.L / 2 + 0.18, p.beltY + 0.12, p.W * 0.30);
    car.add(sup1);
    const sup2 = sup1.clone();
    sup2.position.z = -p.W * 0.30;
    car.add(sup2);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, p.W * 0.95),
      paintMat(spec.color)
    );
    wing.position.set(-p.L / 2 + 0.18, p.beltY + 0.30, 0);
    wing.rotation.z = 0.1;
    car.add(wing);
  }

  // ---- wheels ----
  const wRad = p.wheelR;
  const wW = 0.32;
  const wheelX = p.L / 2 - p.frontOverhang;
  const wheelXr = wheelX - p.wheelbase;
  const wheelZ = p.W / 2 - 0.05;
  const positions = [
    [wheelX,  wheelZ], [wheelX, -wheelZ],
    [wheelXr, wheelZ], [wheelXr, -wheelZ],
  ];
  car.userData.wheels = [];
  for (const [x, z] of positions) {
    const w = makeWheel(wRad, wW, spec.rim || 0x202028, 0xff2d2d, spec.wheels || "default");
    w.position.set(x, wRad, z);
    car.add(w);
    car.userData.wheels.push(w);
  }

  // wheel arches
  for (const [x, z] of positions) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(wRad + 0.04, 0.045, 8, 24, Math.PI),
      plasticMat(0x05070a)
    );
    arch.position.set(x, wRad, z);
    car.add(arch);
  }

  // collect headlight/taillight refs
  car.userData.headlights = [];
  car.userData.taillights = [];
  car.traverse(o => {
    if (o.userData && o.userData.headlight) car.userData.headlights.push(o);
    if (o.userData && o.userData.taillight) car.userData.taillights.push(o);
  });

  car.userData.spec = spec;
  car.userData.bodyLen = p.L;
  car.userData.profile = p;
  return car;
}
