// Cinematic showroom rendering pipeline.
//
// Upgraded graphics stack:
//   - EffectComposer pipeline: RenderPass → UnrealBloom → SMAA → Output
//   - Mirror-style Reflector floor with glowing emissive ring
//   - VSM shadows + 2k shadow maps for soft realistic shadows
//   - Two cinematic showroom spotlights (key + accent) aimed at the plinth
//   - Volumetric light cones (additive billboards) for the godray look
//   - Animated dust / spark particle field
//   - Gradient skydome backdrop with subtle vignette
//
// The public API is unchanged — main.js keeps using the same Showroom class.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { buildCar } from "./carBuilder.js";

// Shared GLTF + DRACO loaders so we can load real photo-quality car models.
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

    // ----- Scene + sky backdrop -----
    this.scene = new THREE.Scene();
    this.scene.background = this._makeSkyTexture();
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.028);

    // ----- Renderer (with progressive fallback) -----
    let renderer = null;
    const opts = [
      { canvas, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false },
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
    // Higher pixel-ratio cap (capable GPUs benefit visibly)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    // VSM produces softer, higher-quality shadows than PCF.
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ----- PMREM environment (used for paint reflections) -----
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // ----- Camera -----
    this.camera = new THREE.PerspectiveCamera(
      40, window.innerWidth / window.innerHeight, 0.1, 200
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
    this._buildPostFX();

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._cameraModes = ["orbit", "front", "side", "rear", "top", "low"];
    this._cameraMode = 0;

    window.addEventListener("resize", () => this._onResize());
    canvas.addEventListener("pointerdown", (e) => this._onClick(e));

    this._clock = new THREE.Clock();
    this._wheelSpinAngle = 0;
  }

  // Procedurally generated equirectangular sky: zenith → horizon → ground.
  // 2:1 aspect (1024×512) so it maps cleanly onto a sphere.
  _makeSkyTexture() {
    const w = 1024, h = 512;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    // Vertical sky gradient: dark blue zenith → near-black mid → cyan horizon
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.00, "#0d1626");
    g.addColorStop(0.30, "#080d18");
    g.addColorStop(0.55, "#04070d");
    g.addColorStop(0.62, "#0a1a2a");   // horizon glow start
    g.addColorStop(0.66, "#143452");
    g.addColorStop(0.70, "#0a1a2a");   // horizon glow end
    g.addColorStop(0.80, "#06090f");
    g.addColorStop(1.00, "#020306");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Cyan horizon haze across the whole strip
    const haze = ctx.createLinearGradient(0, h * 0.60, 0, h * 0.74);
    haze.addColorStop(0,    "rgba(39,224,255,0)");
    haze.addColorStop(0.5,  "rgba(39,224,255,0.12)");
    haze.addColorStop(1,    "rgba(255,59,107,0.05)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.60, w, h * 0.16);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  _buildEnvironment() {
    // ---------- Mirror-reflective floor ----------
    // A `Reflector` is a plane that renders the scene reflected — gives the
    // showroom a real auto-show wet-floor look. We layer a subtle dark glass
    // mesh on top so the reflection isn't blindingly bright.
    const reflectorGeo = new THREE.CircleGeometry(40, 96);
    const reflector = new Reflector(reflectorGeo, {
      clipBias: 0.003,
      textureWidth: Math.min(window.innerWidth, 1280),
      textureHeight: Math.min(window.innerHeight, 720),
      color: 0x1c2230,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.0;
    this.scene.add(reflector);
    this._reflector = reflector;

    // Glass overlay — receives shadows + adds a slight dark tint so the
    // reflection isn't blindingly bright. Kept low-opacity so the mirror
    // still shines through clearly.
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(40, 96),
      new THREE.MeshStandardMaterial({
        color: 0x05070d,
        metalness: 0.0,
        roughness: 0.5,
        transparent: true,
        opacity: 0.30,
      })
    );
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0.001;
    glass.receiveShadow = true;
    this.scene.add(glass);

    // Faint hex / grid pattern fading toward the edges
    const grid = this._makeGridDecal();
    this.scene.add(grid);

    // ---------- Center plinth ----------
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.10, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0a1018, metalness: 0.85, roughness: 0.22,
        emissive: 0x081421, emissiveIntensity: 0.5,
      })
    );
    plinth.position.y = 0.05;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    // Inner glowing accent ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.06, 16, 120),
      new THREE.MeshStandardMaterial({
        color: 0x041420, emissive: 0x27e0ff, emissiveIntensity: 1.6,
        metalness: 0.6, roughness: 0.3,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.105;
    this.scene.add(ring);
    this._ring = ring;

    // Outer halo ring (parking circle for the cars)
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(9.0, 0.04, 12, 160),
      new THREE.MeshStandardMaterial({
        color: 0x040810, emissive: 0xff3b6b, emissiveIntensity: 0.9,
        metalness: 0.4, roughness: 0.5,
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.05;
    this.scene.add(halo);
    this._halo = halo;

    // ---------- Lighting ----------
    // Hemisphere fill (sky/ground colour bounce).
    this.scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x0a0d14, 0.55));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.10));

    // Two cinematic showroom spotlights — one cyan-cool key, one warm rim.
    const keySpot = new THREE.SpotLight(
      0xe8f4ff, 70, 35, Math.PI / 7, 0.45, 1.4
    );
    keySpot.position.set(5.5, 9.5, 5.5);
    keySpot.target.position.set(0, 0.7, 0);
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.set(2048, 2048);
    keySpot.shadow.bias = -0.0004;
    keySpot.shadow.normalBias = 0.025;
    keySpot.shadow.radius = 6; // VSM softness
    this.scene.add(keySpot);
    this.scene.add(keySpot.target);
    this._keySpot = keySpot;

    const rimSpot = new THREE.SpotLight(
      0x9ec8ff, 35, 30, Math.PI / 6, 0.55, 1.5
    );
    rimSpot.position.set(-6.5, 7.5, -7);
    rimSpot.target.position.set(0, 0.7, 0);
    this.scene.add(rimSpot);
    this.scene.add(rimSpot.target);
    this._rimSpot = rimSpot;

    const accentSpot = new THREE.SpotLight(
      0xffd6a8, 25, 25, Math.PI / 7, 0.6, 1.5
    );
    accentSpot.position.set(-3, 6, 7);
    accentSpot.target.position.set(0, 0.7, 0);
    this.scene.add(accentSpot);
    this.scene.add(accentSpot.target);
    this._accentSpot = accentSpot;

    // Animated coloured accent spots that orbit the plinth slowly — like a
    // motor-show stage with moving heads. They cast no shadows (perf).
    this._stageLights = [
      this._makeStageLight(0x27e0ff, 0,            7.0),
      this._makeStageLight(0xff3b6b, Math.PI * 2/3, 7.0),
      this._makeStageLight(0xffd84d, Math.PI * 4/3, 7.0),
    ];

    // ---------- Volumetric light cones (godrays look) ----------
    this._lightCones = [
      this._makeLightCone(keySpot.position,    new THREE.Vector3(0, 0.7, 0), 0x9fd9ff, 0.20),
      this._makeLightCone(rimSpot.position,    new THREE.Vector3(0, 0.7, 0), 0x6ea0ff, 0.12),
      this._makeLightCone(accentSpot.position, new THREE.Vector3(0, 0.7, 0), 0xffd6a8, 0.10),
    ];

    // ---------- Atmospheric dust particles ----------
    this._dust = this._makeDust();
    this.scene.add(this._dust);

    // ---------- Distant ambient stars (twinkle) ----------
    this._stars = this._makeStars();
    this.scene.add(this._stars);
  }

  _makeStageLight(color, angle, radius) {
    const grp = new THREE.Group();
    const lamp = new THREE.PointLight(color, 25, 12, 1.6);
    lamp.position.set(0, 5.5, 0);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    core.position.copy(lamp.position);
    grp.add(lamp);
    grp.add(core);
    grp.userData = { angle, radius, color };
    this.scene.add(grp);
    return grp;
  }

  _makeLightCone(from, to, color, opacity) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geom = new THREE.CylinderGeometry(0.02, 2.2, len, 32, 1, true);
    geom.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying float vY;
        void main(){
          vY = position.y; // negative → tip
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying float vY;
        void main(){
          // Fade with distance from origin (top of cone)
          float fadeLen = smoothstep(0.0, -1.0, vY / 8.0);
          float fall = clamp(1.0 + vY / 8.0, 0.0, 1.0); // bright at top
          // soft rim
          float a = uOpacity * fall * (0.65 + 0.35 * sin(uTime * 1.3 + vY));
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(from);
    mesh.lookAt(to);
    mesh.rotateX(Math.PI / 2);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    return mesh;
  }

  _makeGridDecal() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(120, 200, 255, 0.10)";
    ctx.lineWidth = 1;
    const step = size / 24;
    for (let i = 0; i <= 24; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size);
      ctx.moveTo(0, i * step); ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    // Vignette to fade edges
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, size * 0.05,
      size / 2, size / 2, size * 0.5
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.6, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.55,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(38, 64), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.003;
    return mesh;
  }

  _makeDust() {
    const N = 600;
    const pos = new Float32Array(N * 3);
    const sp  = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i*3+0] = (Math.random() - 0.5) * 28;
      pos[i*3+1] = Math.random() * 6 + 0.2;
      pos[i*3+2] = (Math.random() - 0.5) * 28;
      sp[i] = Math.random() * 0.4 + 0.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSpeed",   new THREE.BufferAttribute(sp, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xbfe6ff) },
        uSize: { value: 18.0 * (this.renderer.getPixelRatio?.() || 1) },
      },
      vertexShader: `
        attribute float aSpeed;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * aSpeed * 0.3, 6.0) + 0.2;
          p.x += sin(uTime * 0.4 + p.z) * 0.15;
          p.z += cos(uTime * 0.4 + p.x) * 0.15;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize / max(0.5, -mv.z);
          // Fade points further from the centre
          vAlpha = clamp(1.0 - length(p.xz) / 16.0, 0.0, 1.0) * 0.65;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uColor;
        varying float vAlpha;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  _makeStars() {
    const N = 1500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Distribute on a hemisphere far away, above the floor
      const r = 80 + Math.random() * 30;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(0.05 + Math.random() * 0.85);
      pos[i*3+0] = r * Math.sin(p) * Math.cos(t);
      pos[i*3+1] = r * Math.cos(p);
      pos[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8d2ff, size: 0.5, sizeAttenuation: true,
      transparent: true, opacity: 0.55, depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  _buildPostFX() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
      samples: 0,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);

    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom: makes the ring, headlights, neon decals & spotlights glow.
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.85,   // strength
      0.55,   // radius
      0.25    // threshold
    );
    this.composer.addPass(bloom);
    this._bloomPass = bloom;

    // SMAA before OutputPass (operates in linear space).
    this.composer.addPass(new SMAAPass(
      w * this.renderer.getPixelRatio(),
      h * this.renderer.getPixelRatio()
    ));
    this.composer.addPass(new OutputPass());
  }

  populate(carSpecs) {
    const N = carSpecs.length;
    this._radius = 9;
    for (let i = 0; i < N; i++) {
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
      car.rotation.y = -a + Math.PI / 2;
      car.scale.setScalar(0.0001);
      this.cars.push(car);
      this.scene.add(car);
    }
    this.setActive(0, true);

    for (let i = 0; i < N; i++) {
      if (carSpecs[i].modelUrl) {
        this.loadGLBOnto(i, carSpecs[i].modelUrl).catch(err => {
          console.warn("[GLB load failed]", carSpecs[i].name, err);
        });
      }
    }
  }

  loadGLBOnto(idx, url, opts = {}) {
    const car = this.cars[idx];
    if (!car) return Promise.reject(new Error("no car at index " + idx));
    const loader = getGLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        const root = gltf.scene || gltf.scenes?.[0];
        if (!root) return reject(new Error("empty GLB"));

        const tmpBox = new THREE.Box3().setFromObject(root);
        const tmpSize = tmpBox.getSize(new THREE.Vector3());
        if (tmpSize.z > tmpSize.x * 1.2) {
          root.rotation.y = Math.PI / 2;
        }

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

        const wheels = [];
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) {
              if (o.material.envMapIntensity === undefined) {
                o.material.envMapIntensity = 1.4;
              } else {
                o.material.envMapIntensity = Math.max(o.material.envMapIntensity, 1.2);
              }
              // Bump up clearcoat-ish look on metallic paint by making sure
              // metalness is preserved and roughness isn't excessive.
              if (o.material.metalness !== undefined && o.material.metalness > 0.5) {
                o.material.roughness = Math.min(o.material.roughness, 0.45);
              }
            }
          }
          const n = (o.name || "").toLowerCase();
          if (/wheel|rotor|tire|tyre/.test(n) && o !== root) {
            wheels.push(o);
          }
        });

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

        if (car.userData.visualChild) {
          car.remove(car.userData.visualChild);
          car.userData.visualChild = null;
        }
        car.add(wrap);
        car.userData.visualChild = wrap;
        car.userData.realModel = true;
        car.userData.glb = root;

        car.userData.wheels = wheels.map((w) => {
          const axis = detectAxleAxis(w);
          return { userData: { spinner: w, axleAxis: axis } };
        });
        car.userData.headlights = [];
        car.userData.taillights = [];

        resolve(root);
      }, undefined, (err) => reject(err));
    });
  }

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
    if (m === "low")   this.camera.position.set(4.5, 0.7, 4.5);
    this.controls.target.set(0, 0.7, 0);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setSize(w, h);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
    }
    if (this._reflector) {
      // Reflector cannot be resized in place easily — leave its target as-is.
    }
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
      h.material.emissiveIntensity = on ? 3.0 : 0.55;
    });
    this._headlightsOn = on;
  }

  setBrakeIntensity(brake) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    car.userData.taillights.forEach(t => {
      t.material.emissiveIntensity = 0.35 + 1.8 * brake;
    });
    this._brake = brake;
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
    this._throttle = throttle;
  }

  update() {
    const N = this.cars.length;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tNow = performance.now();
    const tSec = tNow * 0.001;

    for (let i = 0; i < N; i++) {
      const car = this.cars[i];
      const isActive = i === this.activeIndex;

      if (car.scale.x < 1) car.scale.lerp(new THREE.Vector3(1, 1, 1), 0.10);

      if (isActive) {
        car.position.x = lerp(car.position.x, 0, 0.08);
        car.position.z = lerp(car.position.z, 0, 0.08);
        car.position.y = lerp(car.position.y, 0, 0.10);
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
      this._ring.material.emissiveIntensity = 1.2 + 0.5 * Math.sin(tNow * 0.003);
    }
    if (this._halo) {
      this._halo.rotation.z += 0.0006;
      this._halo.material.emissiveIntensity = 0.7 + 0.4 * Math.sin(tNow * 0.0021);
    }

    if (this._stageLights) {
      for (const sl of this._stageLights) {
        const a = sl.userData.angle + tSec * 0.25;
        sl.position.x = Math.cos(a) * sl.userData.radius;
        sl.position.z = Math.sin(a) * sl.userData.radius;
      }
    }

    if (this._lightCones) {
      for (const c of this._lightCones) {
        c.material.uniforms.uTime.value = tSec;
      }
    }

    if (this._dust) this._dust.material.uniforms.uTime.value = tSec;
    if (this._stars) this._stars.rotation.y = tSec * 0.005;

    // Boost bloom slightly during throttle for dramatic flair.
    if (this._bloomPass) {
      const target = 0.85 + (this._throttle || 0) * 0.35;
      this._bloomPass.strength += (target - this._bloomPass.strength) * 0.08;
    }

    this.controls.update();

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
