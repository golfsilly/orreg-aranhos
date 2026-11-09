import * as THREE from "three";

const SEGMENTS = 64;
const outline = (angle: number) => {
  const front = Math.sin(angle);
  return new THREE.Vector2(Math.cos(angle) * (front > 0 ? 0.052 : 0.043), 0.045 + front * (front > 0 ? 0.14 : 0.115));
};

function upperPoint(angle: number, t: number) {
  const edge = outline(angle);
  const x = THREE.MathUtils.lerp(edge.x, Math.cos(angle) * 0.031, t);
  const z = THREE.MathUtils.lerp(edge.y, Math.sin(angle) * 0.041, t);
  const y = 0.025 + t * 0.077 + Math.sin(t * Math.PI) * 0.012 * (0.5 + Math.sin(angle) * 0.5);
  return new THREE.Vector3(x, y, z);
}

/** Foot-shaped outsole with a flat underside and a narrow, bevelled rim. */
export function buildClogSole() {
  const positions: number[] = []; const indices: number[] = [];
  const rings = [[0, 0.95], [0.008, 1], [0.025, 1]];
  rings.forEach(([y, scale], ring) => {
    for (let vertex = 0; vertex < SEGMENTS; vertex++) {
      const p = outline(vertex / SEGMENTS * Math.PI * 2);
      positions.push(p.x * scale, y, 0.04 + (p.y - 0.04) * scale);
      if (ring === 0) continue;
      const a = (ring - 1) * SEGMENTS + vertex; const b = (ring - 1) * SEGMENTS + (vertex + 1) % SEGMENTS;
      indices.push(a, a + SEGMENTS, b, b, a + SEGMENTS, b + SEGMENTS);
    }
  });
  const bottom = positions.length / 3; positions.push(0, 0, 0.04);
  const top = positions.length / 3; positions.push(0, 0.025, 0.04);
  for (let vertex = 0; vertex < SEGMENTS; vertex++) {
    const next = (vertex + 1) % SEGMENTS; const last = SEGMENTS * 2;
    indices.push(bottom, vertex, next, top, last + next, last + vertex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function buildUpper() {
  const positions: number[] = []; const indices: number[] = [];
  const rings = [0, 0.16, 0.34, 0.56, 0.78, 0.93, 1];
  rings.forEach((t, ring) => {
    for (let vertex = 0; vertex < SEGMENTS; vertex++) {
      positions.push(...upperPoint(vertex / SEGMENTS * Math.PI * 2, t).toArray());
      if (ring === 0) continue;
      const a = (ring - 1) * SEGMENTS + vertex; const b = (ring - 1) * SEGMENTS + (vertex + 1) % SEGMENTS;
      indices.push(a, a + SEGMENTS, b, b, a + SEGMENTS, b + SEGMENTS);
    }
  });
  // Rolled collar turns into the dark interior, leaving an actual ankle opening.
  for (const [radiusX, radiusZ, y] of [[0.028, 0.038, 0.097], [0.027, 0.037, 0.06]]) {
    const previous = positions.length / 3 - SEGMENTS;
    for (let vertex = 0; vertex < SEGMENTS; vertex++) {
      const angle = vertex / SEGMENTS * Math.PI * 2;
      positions.push(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
      const a = previous + vertex; const b = previous + (vertex + 1) % SEGMENTS;
      indices.push(a, a + SEGMENTS, b, b, a + SEGMENTS, b + SEGMENTS);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createSurgicalClog(side: number) {
  const root = new THREE.Group(); root.rotation.y = side * 0.075;
  const shell = new THREE.MeshStandardMaterial({ color: "#e5e9e2", roughness: 0.82 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#75867c", roughness: 0.94 });
  const dark = new THREE.MeshStandardMaterial({ color: "#4f6258", roughness: 0.95 });
  const upper = new THREE.Mesh(buildUpper(), shell); const sole = new THREE.Mesh(buildClogSole(), rubber);
  upper.castShadow = true; upper.receiveShadow = true; sole.castShadow = true; sole.receiveShadow = true;
  root.add(upper, sole);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(1, 32), dark);
  inside.scale.set(0.027, 0.037, 1); inside.rotation.x = -Math.PI / 2; inside.position.y = 0.055; root.add(inside);

  const strap = new THREE.CatmullRomCurve3([[-0.043, 0.066, -0.008], [-0.041, 0.078, -0.059], [0, 0.082, -0.076], [0.041, 0.078, -0.059], [0.043, 0.066, -0.008]].map((point) => new THREE.Vector3(...point)));
  root.add(new THREE.Mesh(new THREE.TubeGeometry(strap, 36, 0.004, 8, false), shell));
  for (let hole = 0; hole < 5; hole++) {
    const angle = 1.05 + hole * 0.26; const t = 0.34;
    const p = upperPoint(angle, t);
    const tangent = upperPoint(angle + 0.01, t).sub(p);
    const inward = upperPoint(angle, t + 0.01).sub(p);
    const normal = inward.cross(tangent).normalize();
    const vent = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 12), dark);
    vent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    vent.position.copy(p).addScaledVector(normal, 0.0003); root.add(vent);
  }
  return root;
}
