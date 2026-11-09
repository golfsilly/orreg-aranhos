import * as THREE from "three";
import { box, label, ring, rod, sphere, surface, tube, type Point } from "./scene-primitives";
import { drawAnatomicalFigure } from "./anatomical-display";

function interfaceTexture(kind: "navigation" | "ventilation" | "room") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 576;
  const context = canvas.getContext("2d");
  if (context) {
    const background = context.createLinearGradient(0, 0, 1024, 576);
    background.addColorStop(0, "#0a222b"); background.addColorStop(1, "#163b3d");
    context.fillStyle = background; context.fillRect(0, 0, 1024, 576);
    context.fillStyle = "#d9f9f0"; context.font = "600 24px Arial";
    context.fillText(kind === "navigation" ? "SURGICAL IMAGE GUIDANCE" : kind === "ventilation" ? "VENTILATION WORKSTATION" : "INTEGRATED THEATRE CONTROL", 30, 43);
    context.fillStyle = "#759f9f"; context.font = "15px Arial"; context.fillText("OR-REG / SIMULATION", 30, 73);
    context.fillStyle = "#6cf2c6"; context.beginPath(); context.arc(966, 39, 6, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#28545a"; context.lineWidth = 1;
    for (let x = 30; x < 1024; x += 42) { context.beginPath(); context.moveTo(x, 110); context.lineTo(x, 509); context.stroke(); }
    for (let y = 110; y < 520; y += 42) { context.beginPath(); context.moveTo(30, y); context.lineTo(994, y); context.stroke(); }
    if (kind === "navigation") {
      drawAnatomicalFigure(context, 229, 313, 220, 0);
      drawAnatomicalFigure(context, 509, 313, 220, 0.9);
      context.fillStyle = "#99c9c4"; context.font = "14px Arial";
      context.fillText("ANTERIOR", 184, 511); context.fillText("OBLIQUE", 469, 511);
      context.strokeStyle = "#e4c67e"; context.setLineDash([4, 5]);
      context.beginPath(); context.moveTo(92, 325); context.lineTo(627, 325); context.stroke(); context.setLineDash([]);
      context.strokeStyle = "#b5e9db"; context.lineWidth = 1;
      context.strokeRect(205, 270, 50, 71);
      for (let index = 0; index < 3; index++) {
        context.fillStyle = "#153b46"; context.fillRect(665, 132 + index * 122, 300, 100);
        context.strokeStyle = "#70cfc2"; context.strokeRect(688, 155 + index * 122, 62, 56);
        context.font = "15px Arial"; context.fillStyle = "#a7d6d0"; context.fillText(["3D RECONSTRUCTION", "OPTICAL TRACKING", "CAMERA SYSTEM"][index], 773, 163 + index * 122);
        context.fillStyle = "#72e6ba"; context.font = "bold 21px Arial"; context.fillText(["VOLUME VIEW", "REGISTERED", "4K UHD"][index], 773, 196 + index * 122);
      }
    } else if (kind === "ventilation") {
      for (let graph = 0; graph < 3; graph++) {
        context.strokeStyle = ["#76ddc1", "#79bde9", "#e5c580"][graph]; context.lineWidth = 3; context.beginPath();
        for (let x = 0; x < 590; x++) {
          const cycle = (x % 145) / 145;
          const value = graph === 0 ? (cycle < 0.58 ? 48 : 5) : Math.sin(cycle * Math.PI * 2) * 32;
          const y = 180 + graph * 119 - value;
          if (x === 0) context.moveTo(35, y); else context.lineTo(35 + x, y);
        }
        context.stroke();
        context.fillStyle = "#9bceca"; context.font = "15px Arial"; context.fillText(["PRESSURE", "FLOW", "VOLUME"][graph], 39, 121 + graph * 119);
      }
      for (let index = 0; index < 3; index++) {
        context.fillStyle = "#102e36"; context.fillRect(705, 120 + index * 122, 254, 105);
        context.fillStyle = "#a9d9d2"; context.font = "16px Arial"; context.fillText(["TIDAL VOLUME", "RESP. RATE", "PEEP"][index], 727, 149 + index * 122);
        context.fillStyle = "#e2fff3"; context.font = "600 39px Arial"; context.fillText(["450 ml", "14 /min", "5 cmH₂O"][index], 727, 198 + index * 122);
      }
    } else {
      for (let index = 0; index < 4; index++) {
        const x = 38 + index % 2 * 484; const y = 123 + Math.floor(index / 2) * 192;
        context.fillStyle = "#163d44"; context.fillRect(x, y, 460, 163);
        context.fillStyle = "#9cc6c1"; context.font = "17px Arial"; context.fillText(["ROOM TEMPERATURE", "POSITIVE PRESSURE", "SURGICAL LIGHT", "AIR EXCHANGE"][index], x + 23, y + 38);
        context.fillStyle = "#c9f6e4"; context.font = "500 49px Arial"; context.fillText(["21.0 °C", "+15 Pa", "4,500 K", "HEPA / ACTIVE"][index], x + 23, y + 105);
        context.fillStyle = "#6edbae"; context.fillRect(x + 24, y + 134, 170 + index * 41, 4);
      }
    }
    context.fillStyle = "#88b9b2"; context.font = "14px Arial"; context.fillText("DEMONSTRATION INTERFACE · NO LIVE CLINICAL DATA", 30, 550);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function display(parent: THREE.Object3D, position: Point, width: number, height: number, content: "navigation" | "ventilation" | "room" | THREE.Texture) {
  const frame = new THREE.Group(); frame.position.set(...position); parent.add(frame);
  box(frame, [width + 0.045, height + 0.045, 0.06], [0, 0, 0], surface("#163335", 0.35, 0.35), 0.018);
  const texture = typeof content === "string" ? interfaceTexture(content) : content;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  screen.position.z = 0.031; frame.add(screen);
  box(frame, [width * 0.35, 0.008, 0.005], [0, -height / 2 - 0.014, 0.032], new THREE.MeshStandardMaterial({ color: "#78dec2", emissive: "#78dec2", emissiveIntensity: 0.75 }), 0.002);
  return frame;
}

export function upgradeAnaesthesiaWorkstation(machine: THREE.Group) {
  const white = surface("#e4eeea", 0.38, 0.16);
  const metal = surface("#9fb8b7", 0.28, 0.78);
  const console = display(machine, [0.015, 1.3, 0.008], 0.52, 0.295, "ventilation");
  console.rotation.x = -0.13;
  box(machine, [0.64, 0.022, 0.24], [0, 1.09, 0.19], white, 0.01);
  for (let button = 0; button < 7; button++) box(machine, [0.035, 0.008, 0.029], [-0.2 + button * 0.064, 1.108, 0.2], metal, 0.006);
  for (let vaporizer = 0; vaporizer < 2; vaporizer++) {
    box(machine, [0.16, 0.21, 0.13], [-0.24 + vaporizer * 0.19, 1.23, -0.3], white, 0.018);
    sphere(machine, [0.044, 0.025, 0.044], [-0.24 + vaporizer * 0.19, 1.36, -0.3], metal);
    label(machine, vaporizer ? "ISO" : "SEVO", 0.105, 0.038, [-0.24 + vaporizer * 0.19, 1.24, -0.229], "#244a4a", "#dbe9e1");
  }
  const led = new THREE.MeshStandardMaterial({ color: "#68d9c2", emissive: "#3bb8a7", emissiveIntensity: 0.6 });
  box(machine, [0.5, 0.01, 0.008], [0, 1.036, 0.35], led, 0.003);
  box(machine, [0.015, 0.58, 0.012], [0.327, 0.66, 0.25], led, 0.003);
}

export function upgradeInfusionStand(stand: THREE.Group) {
  const shell = surface("#dce9e4", 0.45, 0.12);
  for (let index = 0; index < 2; index++) {
    const y = 0.97 - index * 0.255;
    box(stand, [0.215, 0.2, 0.15], [0.035, y, 0.055], shell, 0.018);
    box(stand, [0.134, 0.075, 0.008], [0.015, y + 0.025, 0.136], surface("#163e43", 0.2), 0.005);
    label(stand, index ? "50.0 ml/h" : "75.0 ml/h", 0.12, 0.06, [0.015, y + 0.025, 0.142], "#a1f3d8", "#163e43");
    sphere(stand, [0.015, 0.015, 0.008], [0.11, y + 0.05, 0.135], new THREE.MeshStandardMaterial({ color: "#8beaaf", emissive: "#55cf93", emissiveIntensity: 0.5 }));
    box(stand, [0.1, 0.012, 0.012], [0.015, y - 0.05, 0.142], shell, 0.004);
  }
}

export function installAdvancedEquipment(parent: THREE.Group, vitalSigns: THREE.Texture) {
  const white = surface("#e0ece7", 0.4, 0.18);
  const graphite = surface("#203b3b", 0.38, 0.4);
  const steel = surface("#a4beb9", 0.25, 0.82);
  const rubber = surface("#253536", 0.8);
  const light = new THREE.MeshStandardMaterial({ color: "#82e1d1", emissive: "#61ddc8", emissiveIntensity: 0.65 });

  // Integrated UHD imaging tower, with processors, optical ports and a touch display.
  const tower = new THREE.Group(); tower.position.set(-2.27, 0, -0.5); tower.rotation.y = 0.3; parent.add(tower);
  box(tower, [0.68, 0.11, 0.61], [0, 0.16, 0], graphite, 0.05);
  for (const x of [-0.25, 0.25]) for (const z of [-0.22, 0.22]) {
    rod(tower, [x, 0.06, z], [x, 0.18, z], 0.016, steel);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.034, 16), rubber); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.055, z); tower.add(wheel);
  }
  box(tower, [0.49, 1.14, 0.43], [0, 0.78, 0], white, 0.04);
  for (let rack = 0; rack < 4; rack++) {
    const y = 0.42 + rack * 0.235;
    box(tower, [0.44, 0.174, 0.045], [0, y, 0.23], graphite, 0.008);
    box(tower, [0.24, 0.06, 0.005], [-0.05, y + 0.018, 0.256], surface("#183c43", 0.3), 0.003);
    label(tower, ["4K PROCESSOR", "LED LIGHT SOURCE", "CO₂ CONTROL", "IMAGE RECORDING"][rack], 0.235, 0.04, [-0.05, y + 0.018, 0.26], "#a7e6d9", "#183c43");
    sphere(tower, [0.017, 0.017, 0.01], [0.165, y + 0.02, 0.258], steel);
    for (let port = 0; port < 3; port++) sphere(tower, [0.009, 0.009, 0.005], [-0.13 + port * 0.06, y - 0.045, 0.258], light);
  }
  rod(tower, [0, 1.27, -0.14], [0, 1.7, -0.14], 0.033, steel);
  // The tower shows live simulated vital signs; the pendant keeps the anatomy view.
  const towerScreen = display(tower, [0, 1.79, -0.09], 0.85, 0.49, vitalSigns); towerScreen.rotation.x = -0.08;
  tube(tower, [[0.2, 0.6, 0.27], [0.44, 0.53, 0.3], [0.43, 0.33, 0.18], [0.3, 0.31, 0]], 0.012, rubber);

  // Ceiling-mounted surgical display on an articulated pendant arm.
  rod(parent, [-1.85, 2.88, 0.65], [-1.85, 2.55, 0.65], 0.04, steel);
  rod(parent, [-1.85, 2.55, 0.65], [-2.1, 2.55, 1.4], 0.035, white);
  rod(parent, [-2.1, 2.55, 1.4], [-2.1, 2.15, 1.4], 0.025, steel);
  const displayGroup = display(parent, [-2.1, 2.13, 1.44], 1.06, 0.61, "navigation"); displayGroup.rotation.y = 0.3;

  // Optical guidance arm: covered links, protected rotary joints and stereo optics.
  const robot = new THREE.Group(); robot.position.set(2.35, 0, 1.7); parent.add(robot);
  box(robot, [0.63, 0.12, 0.58], [0, 0.09, 0], graphite, 0.06);
  box(robot, [0.4, 0.72, 0.35], [0, 0.49, 0], white, 0.055);
  box(robot, [0.24, 0.035, 0.012], [0, 0.69, 0.184], light, 0.01);
  const armPoints: Point[] = [[0, 0.88, 0], [0.1, 1.5, -0.03], [-0.65, 2.12, -0.3], [-2.35, 2.17, -1.5]];
  armPoints.forEach((point, index) => {
    sphere(robot, [0.091, 0.091, 0.091], point, graphite);
    const joint = ring(robot, 0.087, 0.009, point, light); joint.rotation.y = index * 0.45;
    if (index < armPoints.length - 1) {
      rod(robot, point, armPoints[index + 1], index ? 0.058 : 0.079, white, index ? 0.068 : 0.085);
      const start = new THREE.Vector3(...point); const end = new THREE.Vector3(...armPoints[index + 1]);
      const middle = start.clone().lerp(end, 0.5);
      const housing = box(robot, [0.155, start.distanceTo(end) * 0.64, 0.12], [middle.x, middle.y, middle.z], white, 0.035);
      housing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    }
  });
  const optic = new THREE.Group(); optic.position.set(-2.35, 2.1, -1.5); optic.rotation.x = -0.35; robot.add(optic);
  box(optic, [0.26, 0.12, 0.16], [0, 0, 0], graphite, 0.025);
  for (const x of [-0.075, 0.075]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.055, 24), steel); lens.rotation.x = Math.PI / 2; lens.position.set(x, -0.008, 0.1); optic.add(lens);
    sphere(optic, [0.027, 0.027, 0.009], [x, -0.008, 0.131], surface("#163f58", 0.07, 0.65));
  }
  label(robot, "OPTICAL GUIDANCE", 0.3, 0.055, [0, 0.47, 0.18], "#71978d", "#e0ece7");
  tube(robot, [[0.1, 0.91, -0.05], [0.2, 1.53, -0.09], [-0.59, 2.18, -0.35], [-2.35, 2.21, -1.55]], 0.012, rubber);

  // Wall-mounted theatre automation console.
  display(parent, [2.03, 1.94, -2.46], 1.08, 0.61, "room");
}
