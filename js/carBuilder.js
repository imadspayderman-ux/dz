// Procedural 3D car builder. Each car is composed of primitives (rounded
// boxes, cylinders, spheres) so we can generate many distinct vehicles
// without heavy GLTF assets. Result is a THREE.Group containing the full car.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const _emissiveRed = 0xff0a0a;
const _glassColor = 0x101820;

function paintMat(color) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.55, roughness: 0.28,
    clearcoat: 1.0, clearcoatRoughness: 0.06,
    reflectivity: 0.6,
  });
}
function chromeMat(color = 0xc9d1d9) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 1.0, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.05,
  });
}
function rubberMat() {
  return new THREE.MeshStandardMaterial({ color: 0x111315, metalness: 0.1, roughness: 0.95 });
}
function plasticMat(color = 0x101216) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.7 });
}
function glassMat() {
  return new THREE.MeshPhysicalMaterial({
    color: _glassColor, metalness: 0.0, roughness: 0.05,
    transmission: 0.6, ior: 1.45, thickness: 0.3,
    transparent: true, opacity: 0.55,
  });
}

function makeWheel(radius = 0.42, width = 0.32, rimColor = 0x202020) {
  const wheel = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 28);
  const tire = new THREE.Mesh(tireGeo, rubberMat());
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width * 1.02, 24);
  const rim = new THREE.Mesh(rimGeo, chromeMat(rimColor));
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);

  // brake disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width * 0.4, 24),
    new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.9, roughness: 0.3 })
  );
  disc.rotation.z = Math.PI / 2;
  wheel.add(disc);

  // 5-spoke rim detail
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, radius * 1.05, width * 0.5),
      chromeMat(rimColor)
    );
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    wheel.add(spoke);
  }

  // brake caliper
  const cal = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.7, radius * 0.5, radius * 0.45),
    new THREE.MeshStandardMaterial({ color: 0xff2d2d, metalness: 0.4, roughness: 0.5 })
  );
  cal.position.set(0, radius * 0.45, 0);
  wheel.add(cal);

  wheel.userData.spinAxis = new THREE.Vector3(1, 0, 0);
  return wheel;
}

function addBody(group, body, color, accent) {
  // Main body silhouette via stacked rounded boxes; tweak per body type.
  const profiles = {
    muscle:  { len: 4.7, wid: 1.95, h: 0.55, roofLen: 1.6, roofH: 0.55, roofOff: -0.05, hood: true,  rake: 0.0 },
    super:   { len: 4.5, wid: 2.00, h: 0.42, roofLen: 1.2, roofH: 0.42, roofOff:  0.05, hood: false, rake: 0.04 },
    sedan:   { len: 4.85,wid: 1.90, h: 0.55, roofLen: 2.1, roofH: 0.55, roofOff:  0.00, hood: true,  rake: 0.0 },
    hatch:   { len: 4.10,wid: 1.85, h: 0.55, roofLen: 2.0, roofH: 0.6,  roofOff:  0.30, hood: true,  rake: 0.0 },
    roadster:{ len: 4.20,wid: 1.85, h: 0.50, roofLen: 0,   roofH: 0,    roofOff:  0,    hood: true,  rake: 0.02 },
    wagon:   { len: 4.65,wid: 1.90, h: 0.55, roofLen: 2.5, roofH: 0.62, roofOff:  0.20, hood: true,  rake: 0.0 },
    gt:      { len: 4.80,wid: 2.00, h: 0.50, roofLen: 1.7, roofH: 0.52, roofOff: -0.05, hood: true,  rake: 0.03 },
    hyper:   { len: 4.55,wid: 2.05, h: 0.40, roofLen: 1.0, roofH: 0.40, roofOff:  0.10, hood: false, rake: 0.06 },
  };
  const P = profiles[body] || profiles.sedan;
  const mat = paintMat(color);

  // chassis (lower body)
  const lower = new THREE.Mesh(
    new RoundedBoxGeometry(P.len, P.h, P.wid, 5, 0.18),
    mat
  );
  lower.position.y = P.h / 2 + 0.4;
  lower.castShadow = true; lower.receiveShadow = true;
  group.add(lower);

  // hood/nose lift for muscle/sedan look
  if (P.hood) {
    const hood = new THREE.Mesh(
      new RoundedBoxGeometry(P.len * 0.42, P.h * 0.65, P.wid * 0.92, 5, 0.12),
      mat
    );
    hood.position.set(P.len * 0.22, P.h + 0.45, 0);
    hood.castShadow = true;
    group.add(hood);
  }

  // greenhouse / roof
  if (P.roofLen > 0) {
    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(P.roofLen, P.roofH, P.wid * 0.88, 5, 0.18),
      mat
    );
    roof.position.set(P.roofOff - 0.05, P.h + P.roofH / 2 + 0.45, 0);
    roof.castShadow = true;
    group.add(roof);

    // glass: windshield, rear, sides
    const ws = new THREE.Mesh(
      new THREE.BoxGeometry(P.roofLen * 0.55, P.roofH * 0.95, P.wid * 0.86),
      glassMat()
    );
    ws.position.set(P.roofOff + P.roofLen * 0.22, P.h + P.roofH / 2 + 0.45, 0);
    ws.rotation.z = -0.18;
    group.add(ws);

    const rw = new THREE.Mesh(
      new THREE.BoxGeometry(P.roofLen * 0.5, P.roofH * 0.9, P.wid * 0.86),
      glassMat()
    );
    rw.position.set(P.roofOff - P.roofLen * 0.22, P.h + P.roofH / 2 + 0.45, 0);
    rw.rotation.z = 0.22;
    group.add(rw);

    // side windows
    for (const sgn of [-1, 1]) {
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(P.roofLen * 0.85, P.roofH * 0.7, 0.04),
        glassMat()
      );
      sw.position.set(P.roofOff - 0.05, P.h + P.roofH * 0.55 + 0.45, sgn * P.wid * 0.44);
      group.add(sw);
    }
  }

  // beltline trim accent
  for (const sgn of [-1, 1]) {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(P.len * 0.85, 0.04, 0.03),
      chromeMat(accent)
    );
    trim.position.set(0, P.h + 0.4, sgn * (P.wid / 2 + 0.005));
    group.add(trim);
  }

  // front grill
  const grill = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, P.h * 0.8, P.wid * 0.55),
    plasticMat(0x07090c)
  );
  grill.position.set(P.len / 2 - 0.02, 0.45 + P.h * 0.4, 0);
  group.add(grill);

  // grill bars
  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, P.wid * 0.5),
      chromeMat(accent)
    );
    bar.position.set(P.len / 2 - 0.005, 0.45 + 0.18 + i * 0.07, 0);
    group.add(bar);
  }

  // headlights
  for (const sgn of [-1, 1]) {
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.10, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xfff5d2, emissiveIntensity: 1.6,
        metalness: 0.4, roughness: 0.2,
      })
    );
    h.position.set(P.len / 2 - 0.05, 0.45 + P.h * 0.85, sgn * (P.wid / 2 - 0.35));
    group.add(h);
    h.userData.headlight = true;
  }

  // taillights
  for (const sgn of [-1, 1]) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.13, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x4a0606, emissive: _emissiveRed, emissiveIntensity: 0.9,
        metalness: 0.4, roughness: 0.4,
      })
    );
    t.position.set(-P.len / 2 + 0.02, 0.45 + P.h * 0.7, sgn * (P.wid / 2 - 0.35));
    group.add(t);
    t.userData.taillight = true;
  }

  // side mirrors
  for (const sgn of [-1, 1]) {
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.10, 0.10, 4, 0.04),
      paintMat(color)
    );
    m.position.set(P.len * 0.05, P.h + 0.55, sgn * (P.wid / 2 + 0.02));
    group.add(m);
  }

  // exhaust tips (no exhaust on EV)
  if (body !== "ev") {
    for (const sgn of [-1, 1]) {
      const e = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.075, 0.18, 16),
        chromeMat(0xb6bdc6)
      );
      e.rotation.z = Math.PI / 2;
      e.position.set(-P.len / 2 - 0.02, 0.5, sgn * 0.45);
      group.add(e);
    }
  }

  // splitter / front lip
  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.04, P.wid * 0.95),
    plasticMat(0x101216)
  );
  splitter.position.set(P.len / 2 - 0.18, 0.32, 0);
  group.add(splitter);

  // diffuser
  const diff = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, P.wid * 0.85),
    plasticMat(0x080a0d)
  );
  diff.position.set(-P.len / 2 + 0.18, 0.32, 0);
  group.add(diff);

  return P;
}

function addSpoiler(group, kind, P, color) {
  if (kind === "none") return;
  if (kind === "lip") {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, P.wid * 0.92),
      paintMat(color)
    );
    lip.position.set(-P.len / 2 + 0.05, P.h + 0.45 + 0.05, 0);
    group.add(lip);
  } else if (kind === "duck") {
    const d = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.10, P.wid * 0.94),
      paintMat(color)
    );
    d.position.set(-P.len / 2 + 0.2, P.h + 0.45 + 0.12, 0);
    d.rotation.z = -0.2;
    group.add(d);
  } else if (kind === "wing") {
    const sup1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.32, 0.05), plasticMat(0x101216)
    );
    sup1.position.set(-P.len / 2 + 0.18, P.h + 0.62, P.wid * 0.30);
    group.add(sup1);
    const sup2 = sup1.clone(); sup2.position.z = -P.wid * 0.30; group.add(sup2);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, P.wid * 0.95),
      paintMat(color)
    );
    wing.position.set(-P.len / 2 + 0.18, P.h + 0.78, 0);
    wing.rotation.z = 0.12;
    group.add(wing);
  } else if (kind === "active") {
    const sup1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.18, 0.04), plasticMat(0x101216)
    );
    sup1.position.set(-P.len / 2 + 0.16, P.h + 0.55, P.wid * 0.30);
    group.add(sup1);
    const sup2 = sup1.clone(); sup2.position.z = -P.wid * 0.30; group.add(sup2);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, P.wid * 0.92),
      paintMat(color)
    );
    wing.position.set(-P.len / 2 + 0.16, P.h + 0.66, 0);
    group.add(wing);
  }
}

export function buildCar(spec) {
  const car = new THREE.Group();
  car.name = spec.id;

  const P = addBody(car, spec.body, spec.color, spec.accent);
  addSpoiler(car, spec.spoiler || "none", P, spec.color);

  // wheels
  const wRad = ({hyper:0.40, super:0.42, muscle:0.46, sedan:0.44, hatch:0.40, roadster:0.42, wagon:0.45, gt:0.45})[spec.body] || 0.42;
  const wW = 0.35;
  const xWb = P.len * 0.36;
  const zWb = P.wid / 2 + 0.01;
  const wheelMounts = [
    [ xWb,  zWb], [ xWb, -zWb],
    [-xWb,  zWb], [-xWb, -zWb],
  ];
  car.userData.wheels = [];
  for (const [x, z] of wheelMounts) {
    const w = makeWheel(wRad, wW, spec.rim);
    w.position.set(x, wRad, z);
    car.add(w);
    car.userData.wheels.push(w);
  }

  // baseline lift
  car.position.y = 0;

  // collect headlights/taillights for toggling
  car.userData.headlights = [];
  car.userData.taillights = [];
  car.traverse(o => {
    if (o.userData?.headlight) car.userData.headlights.push(o);
    if (o.userData?.taillight) car.userData.taillights.push(o);
  });

  // store profile data for HUD
  car.userData.spec = spec;
  car.userData.bodyLen = P.len;
  return car;
}
