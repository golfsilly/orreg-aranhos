import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createOperatingRoom } from "./operating-room";
import { sceneViews, type SceneView } from "./scene-views";

export type { SceneView } from "./scene-views";
export type SceneRuntime = ReturnType<typeof createSceneRuntime>;

export function createSceneRuntime(canvas: HTMLCanvasElement, host: HTMLElement, onUnavailable: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 50);
  camera.position.set(...sceneViews.overview.camera);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...sceneViews.overview.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 12.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.38;
  controls.minAzimuthAngle = -0.1;
  controls.maxAzimuthAngle = Math.PI / 2 - 0.06;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.55;
  controls.enabled = false;
  canvas.style.touchAction = "pan-y";
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  environmentScene.dispose();
  pmrem.dispose();
  const hemisphere = new THREE.HemisphereLight("#f6ffe9", "#517366", 1.15);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight("#fff4dc", 2);
  key.position.set(2, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4.5;
  key.shadow.camera.right = 4.5;
  key.shadow.camera.top = 4.5;
  key.shadow.camera.bottom = -4.5;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#d8efe9", 0.65);
  fill.position.set(-3, 3, -1);
  scene.add(fill);
  let dirty = true;
  const room = createOperatingRoom(() => { dirty = true; });
  scene.add(room.root);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.22;
  shadow.receiveShadow = true;
  scene.add(shadow);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animation = gsap.timeline({ paused: reducedMotion });
  room.team.forEach((person, index) => {
    animation.to(person.torso.scale, { y: 1.009, duration: 2.2 + index * 0.28, ease: "sine.inOut", yoyo: true, repeat: -1 }, index * 0.15);
    animation.to(person.head.rotation, { x: person.head.rotation.x + 0.055, z: 0.025 * (index % 2 ? 1 : -1), duration: 2.7 + index * 0.2, ease: "sine.inOut", yoyo: true, repeat: -1 }, index * 0.2);
    person.shoulders.forEach((shoulder, side) => {
      animation.to(shoulder.rotation, { x: shoulder.rotation.x - (side ? 0.055 : 0.1), duration: 1.6 + index * 0.24, ease: "sine.inOut", yoyo: true, repeat: -1 }, index * 0.17 + side * 0.8);
    });
    animation.to(person.elbows[0].rotation, { x: person.elbows[0].rotation.x + 0.13, duration: 1.9 + index * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 }, index * 0.4);
    if (person.role === "anesthesia") animation.to(person.head.rotation, { y: 0.55, duration: 3.8, ease: "sine.inOut", yoyo: true, repeat: -1, repeatDelay: 1.5 }, 0.6);
  });

  let disposed = false;
  let contextLost = false;
  let paused = reducedMotion;
  let visible = true;
  let lastFrame = 0;
  let lastMonitor = 0;
  let simulationTime = 0;
  let lastTimestamp = 0;
  let cameraAnimation: gsap.core.Timeline | null = null;

  const resize = () => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 640 ? 1.25 : 1.7));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 480 ? 46 : 37;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  const syncAnimation = () => animation.paused(paused || document.hidden || !visible);
  const onVisibility = () => { syncAnimation(); dirty = true; };
  document.addEventListener("visibilitychange", onVisibility);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncAnimation(); dirty = true; }, { threshold: 0.05 });
  intersection.observe(host);
  const onControlStart = () => { cameraAnimation?.kill(); dirty = true; };
  controls.addEventListener("start", onControlStart);
  const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; paused = true; animation.pause(); onUnavailable(); };
  canvas.addEventListener("webglcontextlost", onContextLost);

  function focus(view: SceneView, instant = false) {
    cameraAnimation?.kill();
    const preset = sceneViews[view];
    controls.minAzimuthAngle = preset.azimuth[0];
    controls.maxAzimuthAngle = preset.azimuth[1];
    controls.minDistance = preset.distance[0];
    controls.maxDistance = preset.distance[1];
    if (instant || reducedMotion) {
      camera.position.set(...preset.camera);
      controls.target.set(...preset.target);
      controls.update();
      dirty = true;
      return;
    }
    cameraAnimation = gsap.timeline({ onUpdate: () => { dirty = true; } });
    cameraAnimation.to(camera.position, { x: preset.camera[0], y: preset.camera[1], z: preset.camera[2], duration: 1.45, ease: "power2.inOut" }, 0);
    cameraAnimation.to(controls.target, { x: preset.target[0], y: preset.target[1], z: preset.target[2], duration: 1.45, ease: "power2.inOut" }, 0);
  }

  renderer.setAnimationLoop((timestamp) => {
    if (disposed || contextLost || document.hidden || !visible) { lastTimestamp = timestamp; return; }
    if (timestamp - lastFrame < 1000 / 35) return;
    const elapsed = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.08) : 0;
    lastTimestamp = timestamp;
    lastFrame = timestamp;
    if (!paused) simulationTime += elapsed;
    if (!paused && timestamp - lastMonitor > 110) {
      room.updateMonitor(simulationTime);
      lastMonitor = timestamp;
    }
    const changed = controls.update();
    if (!paused || changed || dirty) renderer.render(scene, camera);
    dirty = false;
  });
  renderer.render(scene, camera);

  return {
    focus,
    zoom(direction: "in" | "out") {
      cameraAnimation?.kill();
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * (direction === "in" ? 0.78 : 1.28), controls.minDistance, controls.maxDistance);
      const destination = controls.target.clone().add(offset.setLength(distance));
      if (reducedMotion) { camera.position.copy(destination); controls.update(); dirty = true; return; }
      cameraAnimation = gsap.timeline({ onUpdate: () => { dirty = true; } });
      cameraAnimation.to(camera.position, { x: destination.x, y: destination.y, z: destination.z, duration: 0.45, ease: "power2.out" });
    },
    setPaused(value: boolean) { paused = value; syncAnimation(); dirty = true; },
    setInteractive(value: boolean) { controls.enabled = value; canvas.style.touchAction = value ? "none" : "pan-y"; dirty = true; },
    setTheme(dark: boolean) {
      renderer.setClearColor(dark ? "#10261f" : "#edf2e8", 1);
      hemisphere.intensity = dark ? 1 : 1.15;
      renderer.toneMappingExposure = dark ? 0.9 : 0.94;
      dirty = true;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      animation.kill();
      cameraAnimation?.kill();
      controls.removeEventListener("start", onControlStart);
      controls.dispose();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry);
          const entries = Array.isArray(object.material) ? object.material : [object.material];
          entries.forEach((material) => {
            materials.add(material);
            Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
          });
        }
        if (object instanceof THREE.Light && "shadow" in object && object.shadow instanceof THREE.LightShadow) object.shadow.map?.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      renderer.dispose();
    },
  };
}
