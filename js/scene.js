// Lightweight showroom: dark reflective floor, single keylight + hemisphere
// fill + soft accent, optional turntable. Parked cars sit on a ring around
// the center; the active car rises to the central plinth.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { buildCar } from "./carBuilder.js";

// Shared GLTF + DRACO loaders so we can load real photo-quality car models
// (artist-made GLB files) instead of just the procedural ones.
let _gltfLoader = null;
function getGLTFLoader() {
  if (_gltfLoader) return _gltfLoader;
  _gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  _gltfLoader.setDRACOLoader(draco);
  return _gltfLoader;
}

export class Showroom {
  constructor(canvas) {
    this.canvas = canvas;
    this.cars = [];
    this.activeIndex = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 18, 50);

    // Try the high-quality renderer first; fall back progressively if the
    // GPU / driver refuses (some integrated GPUs don't honour antialias).
    let renderer = null;
    const opts = [
      { canvas, antialias: true,  alpha: false, powerPreference: "high-performance" },
      { canvas, antialias: false, alpha: false, powerPreference: "high-performance" },
      { canvas, antialias: false, alpha: false },
    ];
    let lastErr = null;
    for (const o of opts) {
      try { renderer = new THREE.WebGLRenderer(o); break; }
      catch (e) { lastErr = e; }
    }
    if (!renderer) {
      throw new Error("WebGL غير مدعوم في هذا المتصفح/الجهاز. (" + (lastErr && lastErr.message || "") + ")");
    }
    this.renderer = renderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // PMREM environment for shiny paint reflections (one-shot generation)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      42, window.innerWidth / window.innerHeight, 0.1, 120
    );
    this.camera.position.set(7.5, 3.0, 7.5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 0.7, 0);

    this._buildEnvironment();

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._cameraModes = ["orbit", "front", "side", "rear", "top"];
    this._cameraMode = 0;

    window.addEventListener("resize", () => this._onResize());
    canvas.addEventListener("pointerdown", (e) => this._onClick(e));

    this._clock = new THREE.Clock();
    this._wheelSpinAngle = 0;
  }

  _buildEnvironment() {
    // Reflective dark floor — single mesh, no grids/walls.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(40, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0a0d14, metalness: 0.9, roughness: 0.18,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Glowing turntable plinth in the center.
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.08, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0a1018, metalness: 0.85, roughness: 0.25,
        emissive: 0x081421, emissiveIntensity: 0.4,
      })
    );
    plinth.position.y = 0.04;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.05, 12, 80),
      new THREE.MeshStandardMaterial({
        color: 0x041420, emissive: 0x27e0ff, emissiveIntensity: 1.4,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.085;
    this.scene.add(ring);
    this._ring = ring;

    // Lighting: hemisphere fill + key directional with soft shadows.
    this.scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x0a0d14, 0.7));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(6, 11, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // Cool rim from behind for highlights along roof
    const rim = new THREE.DirectionalLight(0x9ec8ff, 0.5);
    rim.position.set(-6, 5, -7);
    this.scene.add(rim);

    // A subtle warm accent light from the front-side
    const accent = new THREE.DirectionalLight(0xffd6a8, 0.3);
    accent.position.set(-3, 4, 6);
    this.scene.add(accent);
  }

  populate(carSpecs) {
    const N = carSpecs.length;
    this._radius = 9;
    for (let i = 0; i < N; i++) {
      // Wrap the visual mesh in a stable parent group so we can swap in a
      // GLB model later without losing position/rotation/state.
      const car = new THREE.Group();
      const proc = buildCar(carSpecs[i]);
      car.add(proc);
      car.userData.spec = carSpecs[i];
      car.userData.profile = proc.userData.profile;
      car.userData.bodyLen = proc.userData.bodyLen;
      car.userData.wheels = proc.userData.wheels;
      car.userData.headlights = proc.userData.headlights;
      car.userData.taillights = proc.userData.taillights;
      car.userData.visualChild = proc;

      const a = (i / N) * Math.PI * 2;
      car.userData.parkAngle = a;
      car.userData.parkPos = new THREE.Vector3(Math.cos(a) * this._radius, 0, Math.sin(a) * this._radius);
      car.position.copy(car.userData.parkPos);
      car.rotation.y = -a + Math.PI / 2;  // face center
      car.scale.setScalar(0.0001);          // pop-in animation
      this.cars.push(car);
      this.scene.add(car);
    }
    this.setActive(0, true);

    // Asynchronously upgrade cars that have a real GLB model URL.
    for (let i = 0; i < N; i++) {
      if (carSpecs[i].modelUrl) {
        this.loadGLBOnto(i, carSpecs[i].modelUrl).catch(err => {
          console.warn("[GLB load failed]", carSpecs[i].name, err);
        });
      }
    }
  }

  // Load a GLB/GLTF file and use it as the visual mesh of car index `idx`.
  // The model is normalised: centred, scaled to a target length, and oriented
  // with its longest axis along +X (matching our procedural cars). Wheels are
  // detected by node name and split off so they spin separately from the body.
  loadGLBOnto(idx, url, opts = {}) {
    const car = this.cars[idx];
    if (!car) return Promise.reject(new Error("no car at index " + idx));
    const loader = getGLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        const root = gltf.scene || gltf.scenes?.[0];
        if (!root) return reject(new Error("empty GLB"));

        // 1) Determine longest-axis orientation. Some GLBs are +Z forward,
        //    we want +X forward.
        const tmpBox = new THREE.Box3().setFromObject(root);
        const tmpSize = tmpBox.getSize(new THREE.Vector3());
        if (tmpSize.z > tmpSize.x * 1.2) {
          root.rotation.y = Math.PI / 2;
        }

        // 2) Re-measure after rotation, then centre + scale-to-fit.
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetLen = opts.targetLength || 4.6;
        const scale = targetLen / Math.max(size.x, 0.0001);

        const wrap = new THREE.Group();
        root.position.set(-center.x, -box.min.y, -center.z);
        wrap.add(root);
        wrap.scale.setScalar(scale);

        // 3) Enable shadows + collect wheels by name.
        const wheels = [];
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material && o.material.envMapIntensity === undefined) {
              o.material.envMapIntensity = 1.0;
            }
          }
          const n = (o.name || "").toLowerCase();
          if (/wheel|rotor|tire|tyre/.test(n) && o !== root) {
            wheels.push(o);
          }
        });

        // For each wheel, detect which local axis is the axle (the shortest
        // dimension of its mesh bounding box). Defaults to X if unknown.
        function detectAxleAxis(node) {
          let mesh = null;
          node.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
          if (!mesh) return "x";
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          const s = new THREE.Vector3();
          mesh.geometry.boundingBox.getSize(s);
          let axis = "x", min = s.x;
          if (s.y < min) { axis = "y"; min = s.y; }
          if (s.z < min) axis = "z";
          return axis;
        }

        // 4) Replace the procedural visual child with the real model.
        if (car.userData.visualChild) {
          car.remove(car.userData.visualChild);
          car.userData.visualChild = null;
        }
        car.add(wrap);
        car.userData.visualChild = wrap;
        car.userData.realModel = true;
        car.userData.glb = root;

        // wrap each wheel so we have a spinner-like API matching the
        // procedural cars. Also remember the axle axis so we rotate around
        // the correct local axis (not all GLB models use X as their axle).
        car.userData.wheels = wheels.map((w) => {
          const axis = detectAxleAxis(w);
          return { userData: { spinner: w, axleAxis: axis } };
        });
        // GLB models don't expose easy headlight/taillight handles, so
        // we leave those arrays empty (lights still display via the model).
        car.userData.headlights = [];
        car.userData.taillights = [];

        resolve(root);
      }, undefined, (err) => reject(err));
    });
  }

  // Public helper used by drag-and-drop in main.js: load a user-provided
  // .glb / .gltf file (passed as a Blob URL) onto the currently active car.
  loadUserGLBOnActive(url) {
    return this.loadGLBOnto(this.activeIndex, url);
  }

  setActive(index, immediate = false) {
    const N = this.cars.length;
    this.activeIndex = ((index % N) + N) % N;
  }

  setActiveCar(carObject) {
    const idx = this.cars.indexOf(carObject);
    if (idx >= 0) this.setActive(idx);
  }

  cycleCamera() {
    this._cameraMode = (this._cameraMode + 1) % this._cameraModes.length;
    const m = this._cameraModes[this._cameraMode];
    if (m === "orbit") this.camera.position.set(7.5, 3.0, 7.5);
    if (m === "front") this.camera.position.set(6.5, 1.4, 0.01);
    if (m === "side")  this.camera.position.set(0.01, 1.6, 6.5);
    if (m === "rear")  this.camera.position.set(-6.5, 1.5, 0.01);
    if (m === "top")   this.camera.position.set(0.01, 7.5, 0.01);
    this.controls.target.set(0, 0.7, 0);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  _onClick(ev) {
    const rect = this.canvas.getBoundingClientRect();
    this._mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this.cars, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj.parent && !this.cars.includes(obj)) obj = obj.parent;
      if (this.cars.includes(obj)) this.setActiveCar(obj);
    }
  }

  setHeadlights(on) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    car.userData.headlights.forEach(h => {
      h.material.emissiveIntensity = on ? 2.5 : 0.55;
    });
  }

  setBrakeIntensity(brake) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    car.userData.taillights.forEach(t => {
      t.material.emissiveIntensity = 0.35 + 1.6 * brake;
    });
  }

  drive(rpm, throttle, brake) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    const dt = this._clock.getDelta();
    const angVel = (rpm / 8000) * 22.0;
    this._wheelSpinAngle += angVel * dt;
    car.userData.wheels.forEach(w => {
      if (!w.userData.spinner) return;
      const axis = w.userData.axleAxis || "x";
      w.userData.spinner.rotation[axis] = this._wheelSpinAngle;
    });
    const tilt = throttle * 0.02 - brake * 0.04;
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z || 0, tilt, 0.12);
  }

  update() {
    const N = this.cars.length;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tNow = performance.now();

    for (let i = 0; i < N; i++) {
      const car = this.cars[i];
      const isActive = i === this.activeIndex;

      if (car.scale.x < 1) car.scale.lerp(new THREE.Vector3(1, 1, 1), 0.10);

      if (isActive) {
        car.position.x = lerp(car.position.x, 0, 0.08);
        car.position.z = lerp(car.position.z, 0, 0.08);
        car.position.y = lerp(car.position.y, 0, 0.10);
        // gentle turntable rotation
        car.rotation.y += 0.0024;
      } else {
        car.position.lerp(car.userData.parkPos, 0.05);
        const targetRot = -car.userData.parkAngle + Math.PI / 2;
        car.rotation.y = lerp(car.rotation.y, targetRot, 0.05);
        car.rotation.z = lerp(car.rotation.z || 0, 0, 0.1);
        car.position.y = Math.sin(tNow * 0.0008 + i) * 0.04;
      }
    }

    if (this._ring) {
      this._ring.material.emissiveIntensity = 1.1 + 0.4 * Math.sin(tNow * 0.003);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
