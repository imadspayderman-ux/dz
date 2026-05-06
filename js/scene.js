// Showroom scene: floor, lights, environment, camera + orbit, car turntable.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildCar } from "./carBuilder.js";

export class Showroom {
  constructor(canvas) {
    this.canvas = canvas;
    this.cars = [];          // THREE.Group instances on the turntable
    this.activeIndex = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 22, 70);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // PMREM environment for nice metallic reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 200
    );
    this.camera.position.set(7.5, 3.0, 7.5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 0.6, 0);

    this._buildEnvironment();

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._cameraModes = ["orbit", "front", "side", "rear", "top"];
    this._cameraMode = 0;

    window.addEventListener("resize", () => this._onResize());
    canvas.addEventListener("pointerdown", (e) => this._onClick(e));

    this._clock = new THREE.Clock();
    this.activeWheelSpin = 0;
  }

  _buildEnvironment() {
    // Showroom floor — large dark reflective disc
    const floorGeo = new THREE.CircleGeometry(28, 96);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f15, metalness: 0.85, roughness: 0.18,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // grid lines in radial pattern
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a2230, transparent: true, opacity: 0.6 });
    for (let r = 4; r <= 24; r += 4) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0.005, Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.scene.add(new THREE.Line(geo, gridMat));
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 4, 0.005, Math.sin(a) * 4),
        new THREE.Vector3(Math.cos(a) * 24, 0.005, Math.sin(a) * 24),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.scene.add(new THREE.Line(geo, gridMat));
    }

    // turntable plinth under active car
    const plinthGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.06, 64);
    const plinth = new THREE.Mesh(plinthGeo, new THREE.MeshStandardMaterial({
      color: 0x0a1015, metalness: 0.8, roughness: 0.2,
      emissive: 0x081421, emissiveIntensity: 0.3,
    }));
    plinth.position.y = 0.03;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    // emissive ring around plinth
    const ringGeo = new THREE.TorusGeometry(3.2, 0.04, 16, 96);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
      color: 0x0d2a3f, emissive: 0x27e0ff, emissiveIntensity: 1.6,
    }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    this.scene.add(ring);
    this._ring = ring;

    // ambient + key + rim lights for showroom
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(8, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0006;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xa3d6ff, 0.7);
    rim.position.set(-7, 8, -8);
    this.scene.add(rim);

    const spot1 = new THREE.SpotLight(0xff3b6b, 1.0, 25, Math.PI / 8, 0.4, 1);
    spot1.position.set(-8, 6, 6);
    spot1.target.position.set(0, 1, 0);
    this.scene.add(spot1, spot1.target);

    const spot2 = new THREE.SpotLight(0x27e0ff, 1.0, 25, Math.PI / 8, 0.4, 1);
    spot2.position.set(8, 6, -6);
    spot2.target.position.set(0, 1, 0);
    this.scene.add(spot2, spot2.target);

    // billboard rear walls (subtle gradient strips)
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x101521, emissive: 0x0a1f33, emissiveIntensity: 0.5,
      metalness: 0.4, roughness: 0.7,
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(7, 4, 0.3),
        stripMat
      );
      wall.position.set(Math.cos(a) * 22, 2, Math.sin(a) * 22);
      wall.lookAt(0, 2, 0);
      this.scene.add(wall);
    }
  }

  populate(carSpecs) {
    // arrange all cars on a circle around the showroom; the active one rises
    // to the central plinth.
    const N = carSpecs.length;
    this._radius = 12;
    for (let i = 0; i < N; i++) {
      const car = buildCar(carSpecs[i]);
      const a = (i / N) * Math.PI * 2;
      car.userData.parkAngle = a;
      car.userData.parkPos = new THREE.Vector3(Math.cos(a) * this._radius, 0, Math.sin(a) * this._radius);
      car.position.copy(car.userData.parkPos);
      car.rotation.y = -a + Math.PI / 2; // face center
      this.cars.push(car);
      this.scene.add(car);
    }
    this._floatCarsToParked();
    this.setActive(0, true);
  }

  _floatCarsToParked() {
    // initial scale-in animation
    for (const c of this.cars) {
      c.scale.set(0.001, 0.001, 0.001);
    }
  }

  setActive(index, immediate = false) {
    const N = this.cars.length;
    this.activeIndex = ((index % N) + N) % N;
    // signal rotation target
    const targetAngle = -((this.activeIndex / N) * Math.PI * 2);
    if (this._stage == null) this._stage = { angle: targetAngle };
    this._stage.targetAngle = targetAngle;
    if (immediate) this._stage.angle = targetAngle;
  }

  setActiveCar(carObject) {
    const idx = this.cars.indexOf(carObject);
    if (idx >= 0) this.setActive(idx);
  }

  cycleCamera() {
    this._cameraMode = (this._cameraMode + 1) % this._cameraModes.length;
    const m = this._cameraModes[this._cameraMode];
    const r = 7;
    if (m === "orbit") this.camera.position.set(7.5, 3.0, 7.5);
    if (m === "front") this.camera.position.set(r, 1.4, 0.01);
    if (m === "side")  this.camera.position.set(0.01, 1.6, r);
    if (m === "rear")  this.camera.position.set(-r, 1.5, 0.01);
    if (m === "top")   this.camera.position.set(0.01, r * 1.2, 0.01);
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
      h.material.emissiveIntensity = on ? 3.0 : 1.6;
    });
  }

  setBrakeIntensity(brake) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    car.userData.taillights.forEach(t => {
      t.material.emissiveIntensity = 0.7 + 2.0 * brake;
    });
  }

  // wheel spin from RPM (also a slight body-roll tilt with throttle)
  drive(rpm, throttle, brake) {
    const car = this.cars[this.activeIndex];
    if (!car) return;
    // wheel angular velocity proportional to RPM (decoupled from gear)
    const angVel = (rpm / 8000) * 25.0; // rad/s
    const dt = this._clock.getDelta();
    this.activeWheelSpin += angVel * dt;
    car.userData.wheels.forEach(w => {
      w.children[0].rotation.x = this.activeWheelSpin;        // tire
      w.children[1].rotation.x = this.activeWheelSpin;        // rim
      // spokes are children 3..7
      for (let i = 3; i < w.children.length - 1; i++) {
        const sp = w.children[i];
        sp.rotation.x = (i / 5) * Math.PI * 2 + this.activeWheelSpin;
      }
    });
    // body squat / dive
    const bodyTilt = (throttle * 0.025) - (brake * 0.04);
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z || 0, bodyTilt, 0.1);
  }

  update() {
    // animate cars: lerp positions to either the central plinth (active) or
    // the parked ring spot (others). Active one gently rotates on the
    // turntable while other cars idle in place.
    const N = this.cars.length;
    if (!this._stage) return;
    const lerp = (a, b, t) => a + (b - a) * t;
    this._stage.angle = lerp(this._stage.angle, this._stage.targetAngle, 0.06);

    for (let i = 0; i < N; i++) {
      const car = this.cars[i];
      const isActive = i === this.activeIndex;
      const spec = car.userData.spec;

      if (car.scale.x < 1) car.scale.lerp(new THREE.Vector3(1,1,1), 0.08);

      if (isActive) {
        // float into center, slow rotation
        car.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        const t = performance.now() * 0.0001;
        const targetY = Math.sin(t * 8) * 0.005;
        car.position.y = lerp(car.position.y, targetY, 0.15);
        // gentle turntable rotation only while idle
        if (!this._userInteractingWithCar) {
          car.rotation.y += 0.0025;
        }
      } else {
        // back to parked spot, but apply the global stage angle so the ring
        // rotates as user changes selection — gives a carousel feel.
        const a = car.userData.parkAngle + this._stage.angle - this._stage.targetAngle;
        const target = new THREE.Vector3(
          Math.cos(a) * this._radius,
          0,
          Math.sin(a) * this._radius
        );
        car.position.lerp(target, 0.05);
        car.rotation.y = lerp(car.rotation.y, -a + Math.PI / 2, 0.05);
        // small idle bob
        car.position.y = Math.sin(performance.now() * 0.001 + i) * 0.04;
      }
    }

    // pulse plinth ring
    if (this._ring) {
      this._ring.material.emissiveIntensity = 1.2 + 0.5 * Math.sin(performance.now() * 0.003);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
