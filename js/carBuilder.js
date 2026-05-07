// Procedural 3D car builder using extruded side-profile silhouettes.
//
// Each car is one solid body mesh built from a 2D side silhouette (defined
// per body type) extruded along the width axis with smooth beveled edges,
// plus a glass canopy (greenhouse) extruded from a smaller silhouette on
// top. This produces a coherent, recognisable car shape — not stacked
// boxes — while remaining lightweight (one body mesh + one glass mesh +
// 4 wheels + a few accent details).

import * as THREE from "three";

// ---------- shared materials cache ----------
const _matCache = {};
function paintMat(color) {
  const k = "p" + color;
  if (_matCache[k]) return _matCache[k];
  return _matCache[k] = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.55, roughness: 0.32,
    clearcoat: 0.9, clearcoatRoughness: 0.08,
  });
}
function chromeMat(color = 0xc6cdd6) {
  const k = "c" + color;
  if (_matCache[k]) return _matCache[k];
  return _matCache[k] = new THREE.MeshStandardMaterial({
    color, metalness: 1.0, roughness: 0.2,
  });
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
  return _matCache[k] = new THREE.MeshStandardMaterial({
    color, metalness: 0.2, roughness: 0.75,
  });
}
function glassMat() {
  if (!_matCache._glass) {
    _matCache._glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10, metalness: 0.6, roughness: 0.05,
      transmission: 0.0, transparent: true, opacity: 0.85,
      clearcoat: 1.0, clearcoatRoughness: 0.0,
    });
  }
  return _matCache._glass;
}

// ---------- Body silhouette parameters per body type ----------
// All values are in metres, X is along the car (front=+, rear=-),
// Y is up. The body floor sits at y=floorY (just above the wheels).

const BODY_PROFILES = {
  // Low slung two-seater super
  super: {
    L: 4.55, W: 2.00, floorY: 0.32, beltY: 0.78, roofY: 1.10, frontH: 0.62, rearH: 0.62,
    hoodEndX: 0.45, cowlX: 0.30, roofFrontX: 0.05, roofRearX: -0.55,
    deckX: -0.85, trunkRearX: -1.55,
    wheelbase: 2.7, wheelR: 0.42, wheelInset: 0.04, frontOverhang: 0.85, rearOverhang: 1.0,
  },
  // Front-engine GT coupe (long hood, fastback)
  gt: {
    L: 4.80, W: 2.00, floorY: 0.34, beltY: 0.85, roofY: 1.22, frontH: 0.65, rearH: 0.68,
    hoodEndX: 0.55, cowlX: 0.35, roofFrontX: 0.10, roofRearX: -0.55,
    deckX: -0.95, trunkRearX: -1.85,
    wheelbase: 2.85, wheelR: 0.43, wheelInset: 0.05, frontOverhang: 0.95, rearOverhang: 1.0,
  },
  // American muscle: long flat hood, 2-door, square-ish
  muscle: {
    L: 4.85, W: 2.00, floorY: 0.36, beltY: 0.88, roofY: 1.32, frontH: 0.70, rearH: 0.78,
    hoodEndX: 0.65, cowlX: 0.50, roofFrontX: 0.20, roofRearX: -0.50,
    deckX: -0.90, trunkRearX: -1.85,
    wheelbase: 2.85, wheelR: 0.46, wheelInset: 0.04, frontOverhang: 0.95, rearOverhang: 1.05,
  },
  // 4-door sport sedan
  sedan: {
    L: 4.90, W: 1.92, floorY: 0.36, beltY: 0.92, roofY: 1.40, frontH: 0.70, rearH: 0.78,
    hoodEndX: 0.65, cowlX: 0.50, roofFrontX: 0.30, roofRearX: -0.55,
    deckX: -0.95, trunkRearX: -1.95,
    wheelbase: 2.95, wheelR: 0.42, wheelInset: 0.05, frontOverhang: 0.90, rearOverhang: 1.05,
  },
  // Hot hatch
  hatch: {
    L: 4.20, W: 1.85, floorY: 0.34, beltY: 0.90, roofY: 1.45, frontH: 0.70, rearH: 0.85,
    hoodEndX: 0.55, cowlX: 0.45, roofFrontX: 0.20, roofRearX: -0.95,
    deckX: -1.05, trunkRearX: -1.55,
    wheelbase: 2.65, wheelR: 0.40, wheelInset: 0.04, frontOverhang: 0.85, rearOverhang: 0.70,
  },
  // Open roadster (very low canopy)
  roadster: {
    L: 4.20, W: 1.86, floorY: 0.34, beltY: 0.80, roofY: 0.98, frontH: 0.62, rearH: 0.66,
    hoodEndX: 0.45, cowlX: 0.30, roofFrontX: 0.20, roofRearX: -0.20,
    deckX: -0.30, trunkRearX: -1.55,
    wheelbase: 2.6, wheelR: 0.41, wheelInset: 0.04, frontOverhang: 0.95, rearOverhang: 1.05,
  },
  // Hyper / W16 mid-engine, very low and wide
  hyper: {
    L: 4.55, W: 2.05, floorY: 0.32, beltY: 0.78, roofY: 1.05, frontH: 0.58, rearH: 0.70,
    hoodEndX: 0.30, cowlX: 0.10, roofFrontX: -0.10, roofRearX: -0.55,
    deckX: -0.80, trunkRearX: -1.65,
    wheelbase: 2.7, wheelR: 0.42, wheelInset: 0.05, frontOverhang: 0.85, rearOverhang: 1.0,
  },
  // Rally wagon (taller cabin, longer roof)
  wagon: {
    L: 4.65, W: 1.90, floorY: 0.36, beltY: 0.92, roofY: 1.42, frontH: 0.72, rearH: 0.85,
    hoodEndX: 0.55, cowlX: 0.45, roofFrontX: 0.25, roofRearX: -1.30,
    deckX: -1.40, trunkRearX: -1.85,
    wheelbase: 2.75, wheelR: 0.44, wheelInset: 0.04, frontOverhang: 0.90, rearOverhang: 1.0,
  },
};

// Build a closed THREE.Shape representing the car side profile.
function buildBodyShape(p) {
  // Bottom edge floor sits at floorY; the silhouette extends from -L/2 to +L/2.
  const fX = p.L / 2, rX = -p.L / 2;
  const s = new THREE.Shape();
  // Start at front-bottom, go counterclockwise.
  s.moveTo(fX, p.floorY);
  // front face up
  s.lineTo(fX, p.frontH);
  // hood front nose (curve from front face up to hood top)
  s.quadraticCurveTo(fX - 0.05, p.beltY - 0.05, fX - 0.20, p.beltY);
  // hood (flat to cowl)
  s.lineTo(p.cowlX, p.beltY);
  // windshield (curve up to roof front)
  s.quadraticCurveTo(p.cowlX - 0.20, p.beltY + 0.05, p.roofFrontX, p.roofY);
  // roof (flat)
  s.lineTo(p.roofRearX, p.roofY);
  // rear window (curve down to trunk top / deck)
  s.quadraticCurveTo(p.roofRearX - 0.30, p.beltY + 0.10, p.deckX, p.beltY);
  // deck / trunk top
  s.lineTo(p.trunkRearX, p.beltY);
  // rear nose round to rear face
  s.quadraticCurveTo(rX + 0.05, p.beltY - 0.05, rX, p.rearH);
  // rear face down
  s.lineTo(rX, p.floorY);
  // floor back to start
  s.lineTo(fX, p.floorY);
  return s;
}

// Build a smaller "greenhouse" shape (window canopy) using points along the
// upper portion of the body silhouette.
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
    depth: depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// One coherent wheel: tire + brake disc + rim disc with painted spokes.
// Everything that spins is parented to the `spinner` sub-group so we only
// rotate that single group from the animation loop. The caliper stays on
// the outer wheel group (so it doesn't spin with the disc).
function makeWheel(radius, width, rimColor, accentColor) {
  const wheel = new THREE.Group();
  const spinner = new THREE.Group();
  wheel.add(spinner);
  wheel.userData.spinner = spinner;

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

  // brake disc (silver) — sits inboard of the spokes
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.35 })
  );
  disc.rotation.z = Math.PI / 2;
  spinner.add(disc);

  // 5 spokes radiating from the centre, sweeping the full rim
  const armGeo = new THREE.BoxGeometry(width * 0.6, radius * 1.4, 0.04);
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Mesh(armGeo, chromeMat(rimColor));
    arm.rotation.x = (i / 5) * Math.PI * 2;
    spinner.add(arm);
  }

  // hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width * 0.85, 16),
    chromeMat(0x1c1e22)
  );
  hub.rotation.z = Math.PI / 2;
  spinner.add(hub);

  // outer rim face (painted) — visible on the OUTSIDE of the wheel
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.62, radius * 0.78, 24),
    chromeMat(rimColor)
  );
  rim.rotation.y = Math.PI / 2;
  rim.position.x = width / 2 + 0.005;
  spinner.add(rim);

  // brake caliper: does NOT spin (sits at top behind disc)
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.55, radius * 0.5, radius * 0.42),
    new THREE.MeshStandardMaterial({ color: accentColor || 0xff2d2d, metalness: 0.5, roughness: 0.45 })
  );
  caliper.position.y = radius * 0.45;
  wheel.add(caliper);

  return wheel;
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

  // ---- greenhouse / glass canopy (slightly narrower, on top) ----
  const greenShape = buildGreenhouseShape(p);
  const greenGeo = extrudeBody(greenShape, p.W * 0.86, 0.02);
  const green = new THREE.Mesh(greenGeo, glassMat());
  car.add(green);

  // belt-line trim on each side (chrome strip)
  for (const sgn of [-1, 1]) {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(p.L * 0.85, 0.025, 0.02),
      chromeMat(spec.accent || 0xc6cdd6)
    );
    trim.position.set(0, p.beltY - 0.02, sgn * (p.W / 2 - 0.01));
    car.add(trim);
  }

  // ---- front grille ----
  {
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, p.beltY - p.frontH + 0.18, p.W * 0.55),
      plasticMat(0x05070a)
    );
    grille.position.set(p.L / 2, (p.beltY + p.frontH) / 2 - 0.05, 0);
    car.add(grille);
    // 4 chrome bars
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.025, p.W * 0.5),
        chromeMat(spec.accent || 0xc6cdd6)
      );
      bar.position.set(p.L / 2 + 0.005, p.frontH + 0.05 + i * 0.05, 0);
      car.add(bar);
    }
  }

  // ---- headlights ----
  for (const sgn of [-1, 1]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.10, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xfff5d0, emissive: 0xfff0c0,
        emissiveIntensity: 1.1, metalness: 0.4, roughness: 0.2,
      })
    );
    headlight.position.set(p.L / 2 - 0.02, p.beltY - 0.10, sgn * (p.W / 2 - 0.45));
    car.add(headlight);
    headlight.userData.headlight = true;
  }

  // ---- taillights ----
  for (const sgn of [-1, 1]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x4a0606, emissive: 0xff1010,
        emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.4,
      })
    );
    tail.position.set(-p.L / 2 + 0.02, p.beltY - 0.10, sgn * (p.W / 2 - 0.45));
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

  // ---- exhaust tips (skip for EV) ----
  if (!(spec.engine && spec.engine.electric)) {
    for (const sgn of [-1, 1]) {
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
  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.04, p.W * 0.92),
    plasticMat(0x06070a)
  );
  splitter.position.set(p.L / 2 - 0.16, p.floorY - 0.02, 0);
  car.add(splitter);

  const diff = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.06, p.W * 0.85),
    plasticMat(0x06070a)
  );
  diff.position.set(-p.L / 2 + 0.18, p.floorY - 0.01, 0);
  car.add(diff);

  // ---- spoiler (per spec) ----
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
  const wheelX = p.L / 2 - p.frontOverhang;     // front wheel X
  const wheelXr = wheelX - p.wheelbase;          // rear wheel X
  const wheelZ = p.W / 2 - 0.05 - p.wheelInset;
  const positions = [
    [wheelX,  wheelZ], [wheelX, -wheelZ],
    [wheelXr, wheelZ], [wheelXr, -wheelZ],
  ];
  car.userData.wheels = [];
  for (const [x, z] of positions) {
    const w = makeWheel(wRad, wW, spec.rim || 0x202028, spec.accent2);
    w.position.set(x, wRad, z);
    car.add(w);
    car.userData.wheels.push(w);
  }

  // wheel arches: half-torus over each wheel (XY plane around the wheel)
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
