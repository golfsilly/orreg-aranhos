import * as THREE from "three";
import { createMedicalPerson } from "./medical-team";
import { box, label, ring, rod, sphere, surface, tube, type Point } from "./scene-primitives";
import { installAdvancedEquipment, upgradeAnaesthesiaWorkstation, upgradeInfusionStand } from "./advanced-equipment";

function caster(parent: THREE.Object3D, x: number, z: number, steel: THREE.MeshStandardMaterial, rubber: THREE.MeshStandardMaterial) {
  rod(parent, [x, 0.09, z], [x, 0.17, z], 0.016, steel);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.037, 18), rubber);
  wheel.position.set(x, 0.064, z);
  wheel.rotation.z = Math.PI / 2;
  parent.add(wheel);
}

function makeMonitor() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  function update(time: number) {
    if (!context) return;
    context.fillStyle = "#061a1a";
    context.fillRect(0, 0, 768, 512);
    context.fillStyle = "#e1eee7";
    context.font = "20px Arial";
    context.fillText("OR-REG  |  SIMULATION", 30, 35);
    context.fillStyle = "#53786d";
    context.fillRect(25, 50, 718, 1);
    for (let index = 0; index < 3; index++) {
      const color = ["#81e7a9", "#81cddc", "#f0cb7b"][index];
      const base = 104 + index * 107;
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.beginPath();
      for (let x = 0; x < 500; x++) {
        const phase = ((x + time * 85) % 135) / 135;
        const beat = index === 0
          ? Math.exp(-((phase - 0.47) ** 2) / 0.0003) * 34 - Math.exp(-((phase - 0.43) ** 2) / 0.0004) * 10 - Math.exp(-((phase - 0.51) ** 2) / 0.0006) * 18 + Math.sin(phase * Math.PI * 2) * 3
          : Math.sin(phase * Math.PI * 2) * (index === 1 ? 17 : 12);
        const y = base + 28 - beat;
        if (x === 0) context.moveTo(30 + x, y); else context.lineTo(30 + x, y);
      }
      context.stroke();
      context.font = "15px Arial";
      context.fillStyle = color;
      context.fillText(["ECG", "SpO₂", "RESP"][index], 30, base - 16);
      context.font = "bold 65px Arial";
      context.fillText(["72", "99", "14"][index], 577, base + 44);
      context.font = "13px Arial";
      context.fillText(["bpm", "%", "/min"][index], 678, base + 43);
    }
    context.fillStyle = "#dce6da";
    context.font = "18px Arial";
    context.fillText("NIBP  118 / 76", 30, 445);
    context.fillText("TEMP  36.7 °C", 380, 445);
    context.fillStyle = "#6d9486";
    context.font = "14px Arial";
    context.fillText("DEMONSTRATION ONLY · NO PATIENT DATA", 30, 484);
    texture.needsUpdate = true;
  }
  update(0);
  return { texture, update };
}

function surgicalLight(parent: THREE.Object3D, position: Point, size: number, steel: THREE.MeshStandardMaterial, white: THREE.MeshStandardMaterial) {
  const head = new THREE.Group();
  head.position.set(...position);
  head.rotation.set(0.12, 0, -0.15);
  parent.add(head);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.75, size, 0.1, 48), white);
  head.add(back);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.91, size * 0.91, 0.012, 48), surface("#dce7dc", 0.22, 0.2));
  glass.position.y = -0.058;
  head.add(glass);
  const led = new THREE.MeshStandardMaterial({ color: "#fff8dd", emissive: "#fff3c7", emissiveIntensity: 1.2, roughness: 0.2 });
  for (let index = 0; index < 5; index++) {
    const angle = index / 5 * Math.PI * 2;
    const x = Math.cos(angle) * size * 0.52;
    const z = Math.sin(angle) * size * 0.52;
    const cluster = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.21, size * 0.21, 0.015, 18), steel);
    cluster.position.set(x, -0.075, z);
    head.add(cluster);
    for (let bulb = 0; bulb < 6; bulb++) {
      const a = bulb / 6 * Math.PI * 2;
      sphere(head, [0.017, 0.008, 0.017], [x + Math.cos(a) * size * 0.12, -0.088, z + Math.sin(a) * size * 0.12], led);
    }
  }
  rod(head, [0, -0.05, 0], [0, -0.21, 0], 0.023, white);
  sphere(head, [0.035, 0.02, 0.035], [0, -0.22, 0], steel);
  const handle = ring(head, size * 0.9, 0.014, [0, 0, 0], steel);
  handle.rotation.x = Math.PI / 2;
}

export function createOperatingRoom(onAssetReady: () => void = () => {}) {
  const root = new THREE.Group();
  const steel = surface("#b9cac8", 0.24, 0.85);
  const white = surface("#e9eee5", 0.55, 0.08);
  const dark = surface("#203d39", 0.6, 0.15);
  const rubber = surface("#2b3b36", 0.85);
  const wall = surface("#cdded4", 0.88);
  const trim = surface("#9cbab1", 0.45, 0.25);
  const drape = surface("#4a9f94", 0.98);
  const lightStrip = new THREE.MeshStandardMaterial({ color: "#f6ffef", emissive: "#f1ffdd", emissiveIntensity: 1.1 });

  // Cutaway room: the open front and right side keep the team visible.
  box(root, [6.2, 0.14, 5.2], [0, -0.08, -0.1], surface("#b7cfc3", 0.56, 0.08), 0.03);
  box(root, [6.35, 0.06, 5.35], [0, -0.18, -0.1], surface("#44776a", 0.45, 0.2), 0.04);
  const gridVertices: number[] = [];
  for (let x = -3; x <= 3; x += 0.6) gridVertices.push(x, 0, -2.65, x, 0, 2.45);
  for (let z = -2.5; z <= 2.45; z += 0.6) gridVertices.push(-3.1, 0.001, z, 3.1, 0.001, z);
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3)), new THREE.LineBasicMaterial({ color: "#95b6a8", transparent: true, opacity: 0.55 }));
  root.add(grid);
  box(root, [6.2, 2.85, 0.12], [0, 1.39, -2.67], wall);
  box(root, [0.12, 2.85, 5.2], [-3.12, 1.39, -0.1], wall);
  box(root, [6.15, 0.15, 0.08], [0, 0.13, -2.58], trim, 0);
  box(root, [0.08, 0.15, 5.15], [-3.03, 0.13, -0.1], trim, 0);
  for (let panel = 0; panel < 7; panel++) box(root, [0.008, 2.6, 0.015], [-2.63 + panel * 0.88, 1.41, -2.59], trim, 0);
  for (let panel = 0; panel < 6; panel++) box(root, [0.015, 2.6, 0.008], [-3.04, 1.41, -2.26 + panel * 0.86], trim, 0);
  box(root, [5.95, 0.035, 0.08], [0, 2.73, -2.56], lightStrip, 0.01);
  box(root, [0.08, 0.035, 4.95], [-3, 2.73, -0.1], lightStrip, 0.01);

  // Sliding theatre door, observation window, wall outlets and control panel.
  box(root, [1.45, 2.35, 0.07], [0.48, 1.19, -2.57], trim);
  box(root, [1.3, 2.23, 0.04], [0.48, 1.18, -2.52], surface("#84a69c", 0.4, 0.12));
  box(root, [0.39, 0.53, 0.03], [0.48, 1.65, -2.48], dark);
  box(root, [0.32, 0.46, 0.008], [0.48, 1.65, -2.46], new THREE.MeshPhysicalMaterial({ color: "#526e67", roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.65 }));
  rod(root, [0.91, 0.99, -2.45], [0.91, 1.27, -2.45], 0.017, steel);
  label(root, "OPERATING THEATRE  /  01", 1.5, 0.18, [0.48, 2.52, -2.48]);
  box(root, [0.16, 0.24, 0.05], [1.4, 1.16, -2.5], white);
  sphere(root, [0.019, 0.019, 0.014], [1.4, 1.2, -2.46], surface("#73d2a0", 0.3));
  box(root, [1.1, 0.58, 0.06], [-1.45, 1.9, -2.51], white);
  label(root, "OR-REG", 0.94, 0.15, [-1.45, 2.04, -2.47], "#295949", "#e7eee4");
  label(root, "PRECISION · CARE · CONNECTION", 0.94, 0.12, [-1.45, 1.85, -2.47], "#55766b", "#e7eee4");
  for (let socket = 0; socket < 4; socket++) {
    box(root, [0.11, 0.11, 0.04], [-2.5 + socket * 0.2, 1.1, -2.54], white, 0.008);
    sphere(root, [0.022, 0.022, 0.012], [-2.5 + socket * 0.2, 1.1, -2.51], surface(["#66ad78", "#e7c95f", "#5b97b5", "#a576a6"][socket]));
  }

  // Operating table, adjustable pedestal, side rails and draped patient.
  box(root, [0.68, 0.1, 1.24], [0, 0.17, 0.15], dark, 0.06);
  box(root, [0.34, 0.6, 0.38], [0, 0.5, 0.08], steel, 0.045);
  box(root, [0.43, 0.16, 0.7], [0, 0.8, 0.13], white);
  box(root, [0.77, 0.11, 2.29], [0, 0.98, 0.13], dark, 0.045);
  box(root, [0.73, 0.09, 2.2], [0, 1.065, 0.13], surface("#304b45", 0.9), 0.045);
  for (const side of [-1, 1]) {
    rod(root, [side * 0.43, 0.91, -0.85], [side * 0.43, 0.91, 1.1], 0.019, steel);
    for (const z of [-0.75, 0.85]) rod(root, [side * 0.43, 0.85, z], [side * 0.43, 1.01, z], 0.015, steel);
  }
  box(root, [0.42, 0.1, 0.36], [0, 1.12, -0.79], white, 0.045);
  sphere(root, [0.11, 0.098, 0.142], [0, 1.24, -0.83], surface("#c5987e", 0.65));
  sphere(root, [0.115, 0.085, 0.08], [0, 1.26, -0.91], surface("#a6cec0", 0.92));
  sphere(root, [0.06, 0.014, 0.065], [0, 1.33, -0.77], new THREE.MeshPhysicalMaterial({ color: "#b6d2c9", transparent: true, opacity: 0.5, roughness: 0.12 }));
  tube(root, [[0.03, 1.34, -0.78], [0.27, 1.38, -1.04], [0.67, 1.22, -1.29], [1.15, 1.21, -1.43]], 0.022, surface("#baccc2", 0.45));
  const drapeGeometry = new THREE.PlaneGeometry(1.28, 1.94, 30, 42);
  drapeGeometry.rotateX(-Math.PI / 2);
  const drapePositions = drapeGeometry.getAttribute("position");
  for (let index = 0; index < drapePositions.count; index++) {
    const x = drapePositions.getX(index);
    const z = drapePositions.getZ(index);
    const bodyHeight = 0.19 * Math.exp(-(x * x) / 0.055) * (0.82 + Math.sin(z * 2) * 0.1);
    const sideDrop = Math.max(0, Math.abs(x) - 0.36) * 1.15;
    const wrinkle = Math.sin(x * 40 + z * 8) * 0.007 + Math.cos(z * 29) * 0.004;
    drapePositions.setY(index, bodyHeight - sideDrop + wrinkle);
  }
  drapeGeometry.computeVertexNormals();
  const patientDrape = new THREE.Mesh(drapeGeometry, drape);
  patientDrape.position.set(0, 1.12, 0.29);
  patientDrape.castShadow = true;
  patientDrape.receiveShadow = true;
  root.add(patientDrape);
  box(root, [0.74, 0.38, 0.025], [0, 1.45, -0.56], drape, 0.01);
  rod(root, [-0.42, 1.02, -0.56], [-0.42, 1.64, -0.56], 0.01, steel);
  rod(root, [0.42, 1.02, -0.56], [0.42, 1.64, -0.56], 0.01, steel);

  // Anaesthetic workstation with live demonstration waveforms.
  const machine = new THREE.Group();
  machine.position.set(1.65, 0, -1.55);
  machine.rotation.y = -0.25;
  root.add(machine);
  box(machine, [0.77, 0.14, 0.65], [0, 0.22, 0], steel);
  for (const x of [-0.28, 0.28]) for (const z of [-0.22, 0.22]) caster(machine, x, z, steel, rubber);
  box(machine, [0.67, 0.77, 0.49], [0, 0.66, 0], white, 0.055);
  for (let drawer = 0; drawer < 3; drawer++) {
    box(machine, [0.51, 0.16, 0.016], [0, 0.45 + drawer * 0.19, 0.254], surface("#a9c8ba", 0.6));
    box(machine, [0.19, 0.015, 0.025], [0, 0.5 + drawer * 0.19, 0.275], steel, 0.005);
  }
  box(machine, [0.78, 0.075, 0.63], [0, 1.07, 0.04], steel);
  box(machine, [0.56, 0.39, 0.19], [0.02, 1.29, -0.12], white);
  box(machine, [0.28, 0.21, 0.014], [-0.06, 1.32, -0.013], dark);
  label(machine, "FLOW  /  2.0", 0.25, 0.09, [-0.06, 1.32, -0.003], "#9ee0bd", "#17392f");
  for (let knob = 0; knob < 4; knob++) sphere(machine, [0.026, 0.026, 0.022], [-0.2 + knob * 0.13, 1.16, 0.09], knob === 0 ? drape : steel);
  rod(machine, [0.14, 1.1, -0.2], [0.14, 1.74, -0.2], 0.026, steel);
  box(machine, [0.81, 0.59, 0.12], [0.07, 1.77, -0.16], dark, 0.035);
  const monitor = makeMonitor();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.73, 0.49), new THREE.MeshBasicMaterial({ map: monitor.texture }));
  screen.position.set(0.07, 1.79, -0.093);
  machine.add(screen);
  sphere(machine, [0.006, 0.006, 0.005], [0.4, 1.51, -0.089], lightStrip);
  tube(machine, [[-0.32, 1.19, 0], [-0.55, 1.14, 0.1], [-0.6, 0.73, 0.1], [-0.48, 0.57, 0.1]], 0.023, rubber);
  sphere(machine, [0.08, 0.15, 0.07], [-0.48, 0.57, 0.1], drape);
  upgradeAnaesthesiaWorkstation(machine);

  // IV stand, drip chamber, transparent bag and tubing.
  const iv = new THREE.Group();
  iv.position.set(2.35, 0, -0.25);
  root.add(iv);
  rod(iv, [0, 0.14, 0], [0, 2.24, 0], 0.014, steel);
  for (let spoke = 0; spoke < 5; spoke++) {
    const a = spoke / 5 * Math.PI * 2;
    rod(iv, [0, 0.13, 0], [Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3], 0.014, steel);
    caster(iv, Math.cos(a) * 0.3, Math.sin(a) * 0.3, steel, rubber);
  }
  tube(iv, [[-0.19, 2.13, 0], [-0.2, 2.23, 0], [0, 2.28, 0], [0.2, 2.23, 0], [0.19, 2.13, 0]], 0.009, steel);
  const fluid = new THREE.MeshPhysicalMaterial({ color: "#d5e8dc", transparent: true, opacity: 0.58, roughness: 0.2, depthWrite: false });
  box(iv, [0.17, 0.27, 0.052], [-0.18, 1.98, 0], fluid);
  box(iv, [0.12, 0.11, 0.002], [-0.18, 2.01, 0.029], white, 0.001);
  tube(iv, [[-0.18, 1.83, 0], [-0.16, 1.68, 0], [-0.11, 1.35, 0.01], [-0.2, 0.95, 0.08]], 0.004, fluid);
  box(iv, [0.18, 0.21, 0.11], [0.03, 1.24, 0.04], white);
  label(iv, "125", 0.1, 0.07, [0.03, 1.27, 0.1], "#9ce5bc", "#153d32");
  upgradeInfusionStand(iv);

  // Instrument trolley: trays, forceps, gauze and bowls.
  const trolley = new THREE.Group();
  trolley.position.set(-1.45, 0, 1.22);
  root.add(trolley);
  for (const x of [-0.36, 0.36]) for (const z of [-0.24, 0.24]) {
    rod(trolley, [x, 0.15, z], [x, 1.05, z], 0.018, steel);
    caster(trolley, x, z, steel, rubber);
  }
  box(trolley, [0.84, 0.04, 0.58], [0, 0.34, 0], steel);
  box(trolley, [0.87, 0.04, 0.62], [0, 1.02, 0], steel);
  box(trolley, [0.82, 0.016, 0.58], [0, 1.05, 0], drape, 0.01);
  for (let tool = 0; tool < 6; tool++) {
    const x = -0.3 + tool * 0.075;
    rod(trolley, [x, 1.077, -0.15], [x + 0.018, 1.077, 0.06], 0.003, steel);
    ring(trolley, 0.016, 0.002, [x, 1.078, -0.18], steel).rotation.x = Math.PI / 2;
    ring(trolley, 0.016, 0.002, [x + 0.03, 1.078, -0.18], steel).rotation.x = Math.PI / 2;
  }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#d1dcd8", metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide }));
  bowl.position.set(0.26, 1.12, -0.06);
  trolley.add(bowl);
  for (let gauze = 0; gauze < 4; gauze++) box(trolley, [0.11, 0.015, 0.1], [0.23, 1.075 + gauze * 0.014, 0.17], white, 0.006);
  box(trolley, [0.2, 0.13, 0.2], [0.19, 0.43, 0.04], white);

  // Ceiling booms and surgical lights.
  box(root, [1.3, 0.09, 0.47], [-0.3, 2.93, -0.3], white);
  rod(root, [-0.65, 2.93, -0.3], [-0.65, 2.67, -0.3], 0.045, steel);
  rod(root, [-0.65, 2.67, -0.3], [-0.85, 2.67, 0.4], 0.035, white);
  rod(root, [-0.85, 2.67, 0.4], [-0.45, 2.51, 0.4], 0.028, steel);
  surgicalLight(root, [-0.45, 2.44, 0.4], 0.37, steel, white);
  rod(root, [0.18, 2.93, -0.3], [0.18, 2.72, -0.3], 0.042, steel);
  rod(root, [0.18, 2.72, -0.3], [0.8, 2.72, -0.58], 0.033, white);
  rod(root, [0.8, 2.72, -0.58], [0.8, 2.42, -0.58], 0.025, steel);
  surgicalLight(root, [0.8, 2.37, -0.58], 0.3, steel, white);
  const surgicalSpot = new THREE.SpotLight("#fff8e3", 10, 5.5, 0.65, 0.75, 1.7);
  surgicalSpot.position.set(0.3, 2.3, 0.25);
  surgicalSpot.target.position.set(0, 1.1, 0.2);
  root.add(surgicalSpot, surgicalSpot.target);
  installAdvancedEquipment(root, monitor.texture);

  const loader = new THREE.TextureLoader();
  const skinMaps = ["male", "female"].map((style) => {
    const texture = loader.load(`/models/medical/skin-${style}.webp`, onAssetReady, undefined, onAssetReady);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    return texture;
  });
  const team = [
    createMedicalPerson({ position: [-0.77, 0, 0.08], angle: Math.PI / 2, color: "#377d6d", skin: "#bf8f70", skinMap: skinMaps[0], gown: true, glasses: true, role: "surgeon" }),
    createMedicalPerson({ position: [0.77, 0, 0.35], angle: -Math.PI / 2, color: "#529b91", skin: "#d4a284", skinMap: skinMaps[1], height: 0.96, gown: true, role: "scrub" }),
    createMedicalPerson({ position: [0.1, 0, -1.64], angle: -0.25, color: "#476f7f", skin: "#c39479", skinMap: skinMaps[0], height: 1.02, glasses: true, role: "anesthesia" }),
    createMedicalPerson({ position: [-1.46, 0, 1.87], angle: Math.PI - 0.25, color: "#6faba0", skin: "#d6a88e", skinMap: skinMaps[1], height: 0.95, role: "nurse" }),
  ];
  team.forEach((person) => root.add(person.root));
  return { root, team, updateMonitor: monitor.update };
}
