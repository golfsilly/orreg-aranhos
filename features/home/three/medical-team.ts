import * as THREE from "three";
import { box, fabricTexture, ring, rod, sphere, surface, tube, type Point } from "./scene-primitives";
import anatomySource from "./medical-anatomy.json";
import uniformSource from "./medical-uniform.json";
import { createMedicalAnatomy } from "./medical-anatomy";
import { createSurgicalClog } from "./surgical-clogs";

export type MedicalRig = { root: THREE.Group; torso: THREE.Group; head: THREE.Bone; shoulders: THREE.Bone[]; elbows: THREE.Bone[]; role: string };
type PersonOptions = { position: Point; angle: number; color: string; skin: string; skinMap?: THREE.Texture; height?: number; gown?: boolean; glasses?: boolean; role: string };

/** A pleated surface follows the nose, cheeks and chin instead of a rigid box. */
function surgicalMask(parent: THREE.Object3D, material: THREE.MeshStandardMaterial, seam: THREE.MeshStandardMaterial) {
  const columns = 28; const rows = 16;
  const positions: number[] = []; const indices: number[] = [];
  const point = (u: number, t: number): Point => {
    const center = Math.sqrt(Math.max(0, 1 - u * u));
    const top = -0.01 + center ** 4 * 0.021;
    const bottom = -0.071 - center * 0.022;
    const width = THREE.MathUtils.lerp(0.08, 0.071, t);
    const front = 0.12 + Math.sin(t * Math.PI) * 0.019 - t * 0.012;
    return [u * width, THREE.MathUtils.lerp(top, bottom, t), 0.042 + center * (front - 0.042) + Math.sin(t * Math.PI * 7) * 0.0011 * center];
  };
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) positions.push(...point(column / columns * 2 - 1, row / rows));
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column; const b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  material.side = THREE.DoubleSide;
  parent.add(new THREE.Mesh(geometry, material));
  for (const t of [0, 0.28, 0.51, 0.74, 1]) {
    tube(parent, Array.from({ length: 17 }, (_, index) => {
      const p = point(index / 8 - 1, t); p[2] += 0.0008; return p;
    }), t === 0 || t === 1 ? 0.0012 : 0.0006, seam);
  }
}

function headwear(head: THREE.Group, cloth: THREE.MeshStandardMaterial, seam: THREE.MeshStandardMaterial, maskMaterial: THREE.MeshStandardMaterial, white: THREE.MeshStandardMaterial, steel: THREE.MeshStandardMaterial, dark: THREE.MeshStandardMaterial, glasses: boolean) {
  const iris = surface("#392e28", 0.35);
  for (const side of [-1, 1]) {
    sphere(head, [0.017, 0.01, 0.011], [side * 0.035, 0.024, 0.071], white);
    sphere(head, [0.0055, 0.0055, 0.003], [side * 0.034, 0.024, 0.081], iris);
    sphere(head, [0.0015, 0.0015, 0.001], [side * 0.032, 0.026, 0.084], white);
    tube(head, [[side * 0.018, 0.049, 0.079], [side * 0.034, 0.053, 0.082], [side * 0.055, 0.047, 0.071]], 0.002, dark);
    tube(head, [[side * 0.08, -0.01, 0.042], [side * 0.105, 0.001, -0.006], [side * 0.108, -0.043, -0.015], [side * 0.071, -0.071, 0.042]], 0.0011, white);
  }
  surgicalMask(head, maskMaterial, surface("#bbdcd2", 0.95));
  sphere(head, [0.111, 0.07, 0.119], [0, 0.127, -0.025], cloth);
  const capEdge = new THREE.CatmullRomCurve3(Array.from({ length: 32 }, (_, index) => {
    const angle = index / 32 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 0.107, 0.092 + Math.sin(angle * 3) * 0.001, Math.sin(angle) * 0.113 - 0.025);
  }), true);
  head.add(new THREE.Mesh(new THREE.TubeGeometry(capEdge, 64, 0.0025, 8, true), seam));
  for (let pleat = 0; pleat < 9; pleat++) {
    const angle = pleat / 9 * Math.PI * 2;
    tube(head, [[Math.cos(angle) * 0.107, 0.094, Math.sin(angle) * 0.113 - 0.025], [Math.cos(angle) * 0.094, 0.15, Math.sin(angle) * 0.101 - 0.025], [Math.cos(angle) * 0.055, 0.183, Math.sin(angle) * 0.06 - 0.025]], 0.0008, seam);
  }
  if (glasses) {
    const glass = new THREE.MeshPhysicalMaterial({ color: "#d4e6e1", transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.1, depthWrite: false });
    for (const side of [-1, 1]) {
      box(head, [0.062, 0.04, 0.009], [side * 0.039, 0.027, 0.096], glass, 0.006);
      tube(head, [[side * 0.011, 0.046, 0.1], [side * 0.057, 0.046, 0.097], [side * 0.073, 0.025, 0.084], [side * 0.103, 0.029, 0.005]], 0.0018, steel);
    }
    rod(head, [-0.009, 0.031, 0.103], [0.009, 0.031, 0.103], 0.0018, steel);
  }
}

export function createMedicalPerson(options: PersonOptions): MedicalRig {
  const root = new THREE.Group();
  root.position.set(...options.position); root.rotation.y = options.angle; root.scale.setScalar(options.height ?? 1);
  const cloth = surface(options.color, 0.96); cloth.bumpMap = fabricTexture(); cloth.bumpScale = 0.0005;
  const seam = surface(new THREE.Color(options.color).multiplyScalar(0.82), 0.96);
  const skin = new THREE.MeshPhysicalMaterial({ color: options.skinMap ? "#fffaf6" : options.skin, map: options.skinMap, roughness: 0.74, sheen: 0.1, sheenColor: "#f6c4ae", sheenRoughness: 0.85 });
  const gloves = surface("#d5e8d8", 0.72);
  const steel = surface("#c0ced0", 0.22, 0.84); const maskMaterial = surface("#9dcfc3", 0.97); const white = surface("#f2f4e9", 0.5); const dark = surface("#172d29", 0.6);

  const torso = new THREE.Group(); torso.position.y = 0.85; torso.rotation.x = options.gown ? 0.11 : 0.035; root.add(torso);
  // One continuous body surface, with blended bone weights at every joint.
  const anatomy = createMedicalAnatomy(anatomySource, { skin, glove: gloves, cloth }, Boolean(options.gown), uniformSource);
  torso.add(anatomy.mesh, anatomy.clothes);
  anatomy.trousers.position.y = 0.85; root.add(anatomy.trousers);
  anatomy.ankles.forEach((ankle, index) => {
    const clog = createSurgicalClog(index === 0 ? -1 : 1);
    clog.position.set(ankle.x, 0, ankle.z); root.add(clog);
  });
  const head = new THREE.Group();
  head.position.set(...anatomySource.headCenter.map((value, axis) => value - anatomySource.head[axis]) as Point);
  head.scale.setScalar(0.103 / 0.115); anatomy.head.add(head); anatomy.head.rotation.x = options.gown ? 0.1 : 0.025;
  headwear(head, cloth, seam, maskMaterial, white, steel, dark, Boolean(options.glasses));

  if (!options.gown) {
    box(torso, [0.054, 0.07, 0.006], [0.083, 0.37, 0.165], white, 0.002);
    box(torso, [0.039, 0.012, 0.007], [0.083, 0.389, 0.17], maskMaterial, 0.001);
    if (options.role === "anesthesia") {
      tube(torso, [[-0.065, 0.575, 0.055], [-0.1, 0.43, 0.11], [-0.06, 0.3, 0.115], [0.035, 0.32, 0.12], [0.065, 0.575, 0.055]], 0.006, dark);
      sphere(torso, [0.02, 0.02, 0.006], [0.035, 0.32, 0.13], steel);
    }
  } else {
    anatomy.wrists.forEach((wrist, index) => {
      const arm = anatomySource.arms[index];
      const tool = new THREE.Group();
      const palm = new THREE.Vector3(...arm.middle as Point).sub(new THREE.Vector3(...arm.wrist as Point));
      tool.position.copy(palm.clone().multiplyScalar(0.78));
      tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), palm.normalize()); wrist.add(tool);
      rod(tool, [-0.004, 0, 0], [0, -0.12, 0.004], 0.0018, steel);
      rod(tool, [0.004, 0, 0], [0.002, -0.12, 0.004], 0.0018, steel);
      ring(tool, 0.009, 0.0013, [-0.004, 0.013, 0], steel);
    });
  }
  return { root, torso, head: anatomy.head, shoulders: anatomy.shoulders, elbows: anatomy.elbows, role: options.role };
}
