import * as THREE from "three";

type Point = number[];
export type AnatomicalArm = { shoulder: Point; elbow: Point; wrist: Point; index: Point; middle: Point; pinky: Point; fingertips: Point[] };
export type AnatomySource = { scale: number; positions: number[]; indices: number[]; uvs?: number[]; normals?: number[]; arms: AnatomicalArm[]; head: Point; headCenter: Point };
const v = (point: Point) => new THREE.Vector3(point[0], point[1], point[2]);
const smooth = (low: number, high: number, value: number) => THREE.MathUtils.smoothstep(value, low, high);

function projection(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) {
  const axis = end.clone().sub(start);
  const t = point.clone().sub(start).dot(axis) / axis.lengthSq();
  const closest = start.clone().addScaledVector(axis, THREE.MathUtils.clamp(t, 0, 1));
  return { t, distance: point.distanceToSquared(closest) };
}

/** The same shared vertices run through the shoulder, elbow, wrist and fingers. */
export function buildAnatomyData(source: AnatomySource) {
  const positions = source.positions.map((value) => value * source.scale);
  const skinIndices: number[] = []; const skinWeights: number[] = [];
  const armInfo: { influence: number; arm: number; upper: number; lower: number; hand: number; onUpper: boolean }[] = [];
  const axes = source.arms.map((arm) => ({ shoulder: v(arm.shoulder), elbow: v(arm.elbow), wrist: v(arm.wrist), hand: v(arm.middle).sub(v(arm.wrist)).normalize() }));
  for (let index = 0; index < positions.length; index += 3) {
    const point = new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]);
    const armIndex = point.x < 0 ? 0 : 1;
    const axis = axes[armIndex];
    const upper = projection(point, axis.shoulder, axis.elbow);
    const lower = projection(point, axis.elbow, axis.wrist);
    const hand = point.clone().sub(axis.wrist).dot(axis.hand);
    const shoulderRegion = smooth(0.35, 0.55, point.y);
    const innerArm = THREE.MathUtils.lerp(0.22, 0.13, shoulderRegion);
    const outerArm = THREE.MathUtils.lerp(0.3, 0.235, shoulderRegion);
    const influence = smooth(innerArm, outerArm, Math.abs(point.x)) * (1 - smooth(0.585, 0.65, point.y));
    armInfo.push({ influence, arm: armIndex, upper: upper.t, lower: lower.t, hand, onUpper: upper.distance < lower.distance });
    if (point.y > 0.575 && Math.abs(point.x) < 0.14) {
      const weight = smooth(0.575, 0.7, point.y);
      skinIndices.push(0, 1, 0, 0); skinWeights.push(1 - weight, weight, 0, 0);
      continue;
    }
    let shoulderWeight = 1; let elbowWeight = 0; let wristWeight = 0;
    if (hand > -0.012 && lower.t > 0.83) {
      wristWeight = 0.5 + 0.5 * smooth(-0.012, 0.018, hand); elbowWeight = 1 - wristWeight; shoulderWeight = 0;
    } else if (upper.distance < lower.distance) {
      elbowWeight = 0.5 * smooth(0.68, 1, upper.t); shoulderWeight = 1 - elbowWeight;
    } else {
      shoulderWeight = 0.5 * (1 - smooth(0, 0.3, lower.t));
      wristWeight = 0.5 * smooth(0.72, 1, lower.t);
      elbowWeight = 1 - shoulderWeight - wristWeight;
    }
    const base = armIndex === 0 ? 2 : 5;
    skinIndices.push(0, base, base + 1, base + 2);
    skinWeights.push(1 - influence, shoulderWeight * influence, elbowWeight * influence, wristWeight * influence);
  }
  return { positions, indices: source.indices, skinIndices, skinWeights, armInfo };
}

function isCovered(base: ReturnType<typeof buildAnatomyData>, vertex: number, gown: boolean, margin = 0) {
  const x = base.positions[vertex * 3]; const y = base.positions[vertex * 3 + 1]; const z = base.positions[vertex * 3 + 2];
  const info = base.armInfo[vertex];
  const front = smooth(0.025, 0.09, z);
  const collar = gown ? 0.612 - 0.018 * front : 0.594 - 0.057 * Math.max(0, 1 - Math.abs(x) / 0.075) * front;
  if (y > collar - margin) return false;
  if (info.influence < 0.3) return true;
  return gown ? info.hand < -0.008 - margin : info.onUpper && info.upper < 0.48 - margin * 4;
}

function outfitGeometry(base: ReturnType<typeof buildAnatomyData>, normals: THREE.BufferAttribute, gown: boolean) {
  const positions = [...base.positions]; const uvs: number[] = [];
  const included: number[] = [];
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const offset = vertex * 3; const info = base.armInfo[vertex];
    const y = positions[offset + 1];
    const fabric = (info.influence < 0.3 ? 0.012 : gown ? 0.008 : 0.011) + Math.sin(y * 83 + positions[offset] * 47) * 0.0012;
    positions[offset] += normals.getX(vertex) * fabric;
    positions[offset + 1] += normals.getY(vertex) * fabric;
    positions[offset + 2] += normals.getZ(vertex) * fabric;
    // Scrubs hang away from the chest and waist; they do not copy bare anatomy.
    const drape = (1 - smooth(0.1, 0.7, info.influence)) * (1 - smooth(0.46, 0.58, y));
    if (drape > 0) {
      const angle = Math.atan2(base.positions[offset + 2] - 0.04, base.positions[offset]);
      const waist = Math.exp(-(((y - 0.28) / 0.13) ** 2));
      const hem = 1 - smooth(0.08, 0.22, y);
      const radiusX = (gown ? 0.193 : 0.185) + hem * (gown ? 0.035 : 0.022) - waist * 0.018 + Math.sin(y * 18) * 0.0015;
      const radiusZ = (Math.sin(angle) >= 0 ? 0.14 + hem * 0.012 : 0.117 + hem * 0.068) - waist * 0.012 + Math.sin(y * 24 + angle * 5) * 0.0015;
      positions[offset] = THREE.MathUtils.lerp(positions[offset], Math.cos(angle) * radiusX, drape);
      positions[offset + 2] = THREE.MathUtils.lerp(positions[offset + 2], 0.04 + Math.sin(angle) * radiusZ, drape);
      positions[offset + 1] -= (gown ? 0.36 : 0.12) * (1 - smooth(0.015, 0.18, y));
    }
    uvs.push(positions[offset] * 3, y * 3);
  }
  for (let index = 0; index < base.indices.length; index += 3) {
    const triangle = base.indices.slice(index, index + 3);
    if (triangle.every((vertex) => base.positions[vertex * 3 + 1] > 0.012 && isCovered(base, vertex, gown))) included.push(...triangle);
  }

  // Turn every sleeve/collar rim inward to give fabric a real hem thickness.
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for (let index = 0; index < included.length; index += 3) for (let side = 0; side < 3; side++) {
    const a = included[index + side]; const b = included[index + (side + 1) % 3]; const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const edge = edges.get(key); if (edge) edge.count++; else edges.set(key, { a, b, count: 1 });
  }
  const skinIndices = [...base.skinIndices]; const skinWeights = [...base.skinWeights];
  const boundary = new Map<number, number[]>();
  [...edges.values()].filter((edge) => edge.count === 1).forEach(({ a, b }) => {
    boundary.set(a, [...boundary.get(a) ?? [], b]); boundary.set(b, [...boundary.get(b) ?? [], a]);
  });
  // Smooth the cut through the source topology into clean collar and sleeve hems.
  for (let pass = 0; pass < 7; pass++) {
    const previous = [...positions];
    boundary.forEach((neighbors, vertex) => {
      for (let axis = 0; axis < 3; axis++) positions[vertex * 3 + axis] = previous[vertex * 3 + axis] * 0.5 + neighbors.reduce((sum, neighbor) => sum + previous[neighbor * 3 + axis], 0) / neighbors.length * 0.5;
    });
  }
  boundary.forEach((_, vertex) => {
    if (base.positions[vertex * 3 + 1] < 0.07 && base.armInfo[vertex].influence < 0.3) positions[vertex * 3 + 1] = gown ? -0.34 : -0.1;
  });
  const inner = new Map<number, number>();
  const innerVertex = (vertex: number) => {
    if (inner.has(vertex)) return inner.get(vertex)!;
    const next = positions.length / 3; inner.set(vertex, next);
    positions.push(...positions.slice(vertex * 3, vertex * 3 + 3).map((value, axis) => value - normals.getComponent(vertex, axis) * 0.003));
    skinIndices.push(...base.skinIndices.slice(vertex * 4, vertex * 4 + 4));
    skinWeights.push(...base.skinWeights.slice(vertex * 4, vertex * 4 + 4));
    uvs.push(...uvs.slice(vertex * 2, vertex * 2 + 2));
    return next;
  };
  [...edges.values()].filter((edge) => edge.count === 1).forEach(({ a, b }) => { const ia = innerVertex(a); const ib = innerVertex(b); included.push(b, a, ia, b, ia, ib); });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(included); geometry.computeVertexNormals();
  return geometry;
}

function trousersGeometry(base: ReturnType<typeof buildAnatomyData>, normals: THREE.BufferAttribute) {
  const positions = [...base.positions]; const uvs: number[] = []; const indices: number[] = [];
  const bands = [new Map<number, number[]>(), new Map<number, number[]>()];
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const [x, y, z] = base.positions.slice(vertex * 3, vertex * 3 + 3);
    if (y > -0.14) continue;
    const side = x < 0 ? 0 : 1; const key = Math.round(y / 0.025);
    const bounds = bands[side].get(key) ?? [Infinity, -Infinity, Infinity, -Infinity];
    bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.max(bounds[1], x); bounds[2] = Math.min(bounds[2], z); bounds[3] = Math.max(bounds[3], z);
    bands[side].set(key, bounds);
  }
  const profiles = bands.map((band) => [...band].sort(([a], [b]) => a - b).map(([key, bounds]) => ({
    y: key * 0.025, x: (bounds[0] + bounds[1]) / 2, z: (bounds[2] + bounds[3]) / 2,
    rx: (bounds[1] - bounds[0]) / 2, rz: (bounds[3] - bounds[2]) / 2,
  })));
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const offset = vertex * 3;
    const y = positions[offset + 1];
    const ease = 0.009 + Math.sin(y * 35) * 0.001;
    for (let axis = 0; axis < 3; axis++) positions[offset + axis] += normals.getComponent(vertex, axis) * ease;
    const x = positions[offset]; const z = positions[offset + 2];
    // Relax the back panel across the seat instead of copying an anatomical cleft.
    const seat = smooth(-0.31, -0.19, y) * (1 - smooth(0.08, 0.14, y)) * (1 - smooth(0, 0.04, z));
    const back = -0.098 - 0.012 * Math.exp(-(((y + 0.03) / 0.12) ** 2)) + (Math.abs(x) / 0.215) ** 2 * 0.065;
    positions[offset + 2] = THREE.MathUtils.lerp(z, back, seat);
    if (y < -0.16) {
      const profile = profiles[x < 0 ? 0 : 1];
      let high = profile.findIndex((band) => band.y >= y); if (high < 0) high = profile.length - 1;
      const a = profile[Math.max(0, high - 1)]; const b = profile[high];
      const t = THREE.MathUtils.clamp((y - a.y) / Math.max(0.001, b.y - a.y), 0, 1);
      const cx = THREE.MathUtils.lerp(a.x, b.x, t); const cz = THREE.MathUtils.lerp(a.z, b.z, t);
      const rx = THREE.MathUtils.lerp(a.rx, b.rx, t); const rz = THREE.MathUtils.lerp(a.rz, b.rz, t);
      const angle = Math.atan2((base.positions[offset + 2] - cz) / Math.max(0.02, rz), (base.positions[offset] - cx) / Math.max(0.02, rx));
      const height = THREE.MathUtils.clamp((y + 0.76) / 0.56, 0, 1);
      const fold = Math.sin(angle * 5 + y * 28) * 0.001;
      const legWidth = THREE.MathUtils.lerp(0.054, 0.078, height) + fold;
      const legDepth = THREE.MathUtils.lerp(0.055, 0.081, height) + fold;
      const relaxed = 1 - smooth(-0.28, -0.16, y);
      positions[offset] = THREE.MathUtils.lerp(positions[offset], cx + Math.cos(angle) * legWidth, relaxed);
      positions[offset + 2] = THREE.MathUtils.lerp(positions[offset + 2], cz + Math.sin(angle) * legDepth, relaxed);
    }
    // Bring the source A-stance into a relaxed working stance, keeping the hips fixed.
    positions[offset] -= Math.sign(x) * 0.105 * smooth(0.1, 0.75, -y);
    uvs.push(positions[offset] * 3, y * 3);
  }
  for (let index = 0; index < base.indices.length; index += 3) {
    const triangle = base.indices.slice(index, index + 3);
    if (triangle.every((vertex) => base.positions[vertex * 3 + 1] < 0.11)) indices.push(...triangle);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createMedicalAnatomy(source: AnatomySource, materials: { skin: THREE.Material; glove: THREE.Material; cloth: THREE.Material }, gown: boolean, uniformSource: AnatomySource = source) {
  const data = buildAnatomyData(source);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(data.skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(data.skinWeights, 4));
  geometry.setIndex(data.indices); geometry.computeVertexNormals();
  if (source.uvs) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(source.uvs.map((value) => value * source.scale), 2));
  if (source.normals) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(source.normals.map((value) => value * source.scale), 3));
  const bare: number[] = []; const gloves: number[] = [];
  for (let index = 0; index < data.indices.length; index += 3) {
    const triangle = data.indices.slice(index, index + 3);
    // Hidden body faces are omitted to prevent skin intersecting a loose uniform.
    if (triangle.every((vertex) => isCovered(data, vertex, gown, 0.028))) continue;
    const gloved = triangle.every((vertex) => data.armInfo[vertex].influence > 0.95 && data.armInfo[vertex].hand > -0.012 && data.armInfo[vertex].lower > 0.84);
    (gloved ? gloves : bare).push(...triangle);
  }
  geometry.setIndex([...bare, ...gloves]); geometry.addGroup(0, bare.length, 0); geometry.addGroup(bare.length, gloves.length, 1);
  const mesh = new THREE.SkinnedMesh(geometry, [materials.skin, materials.glove]); mesh.castShadow = true; mesh.receiveShadow = true;
  const body = new THREE.Bone(); mesh.add(body);
  const head = new THREE.Bone(); head.position.copy(v(source.head)); body.add(head);
  const shoulders: THREE.Bone[] = []; const elbows: THREE.Bone[] = []; const wrists: THREE.Bone[] = [];
  const bones = [body, head];
  source.arms.forEach((arm) => {
    const shoulder = new THREE.Bone(); shoulder.position.copy(v(arm.shoulder)); body.add(shoulder);
    const elbow = new THREE.Bone(); elbow.position.copy(v(arm.elbow).sub(v(arm.shoulder))); shoulder.add(elbow);
    const wrist = new THREE.Bone(); wrist.position.copy(v(arm.wrist).sub(v(arm.elbow))); elbow.add(wrist);
    bones.push(shoulder, elbow, wrist); shoulders.push(shoulder); elbows.push(elbow); wrists.push(wrist);
  });
  const skeleton = new THREE.Skeleton(bones); mesh.bind(skeleton);
  const uniform = buildAnatomyData(uniformSource);
  const uniformGeometry = new THREE.BufferGeometry();
  uniformGeometry.setAttribute("position", new THREE.Float32BufferAttribute(uniform.positions, 3));
  uniformGeometry.setIndex(uniform.indices); uniformGeometry.computeVertexNormals();
  const uniformNormals = uniformGeometry.getAttribute("normal") as THREE.BufferAttribute;
  const clothes = new THREE.SkinnedMesh(outfitGeometry(uniform, uniformNormals, gown), materials.cloth);
  clothes.castShadow = true; clothes.receiveShadow = true; clothes.bind(skeleton, mesh.bindMatrix);
  const trousers = new THREE.Mesh(trousersGeometry(uniform, uniformNormals), materials.cloth);
  trousers.castShadow = true; trousers.receiveShadow = true;
  uniformGeometry.dispose();

  source.arms.forEach((arm, index) => {
    const side = index === 0 ? -1 : 1;
    const upper = v(arm.elbow).sub(v(arm.shoulder));
    const lower = v(arm.wrist).sub(v(arm.elbow));
    const desiredUpper = new THREE.Vector3(side * 0.055, -0.78, gown ? 0.64 : 0.52).normalize();
    shoulders[index].quaternion.setFromUnitVectors(upper.clone().normalize(), desiredUpper);
    const desiredLower = new THREE.Vector3(-side * 0.13, -0.12, 1).normalize().applyQuaternion(shoulders[index].quaternion.clone().invert());
    elbows[index].quaternion.setFromUnitVectors(lower.clone().normalize(), desiredLower);
    const combined = shoulders[index].quaternion.clone().multiply(elbows[index].quaternion);
    const along = v(arm.middle).sub(v(arm.wrist)).normalize();
    const across = v(arm.pinky).sub(v(arm.index)).normalize();
    const palm = along.clone().cross(across).multiplyScalar(-side).normalize();
    const axis = lower.clone().normalize();
    const from = palm.projectOnPlane(axis).normalize();
    const to = new THREE.Vector3(0, -1, 0).applyQuaternion(combined.clone().invert()).projectOnPlane(axis).normalize();
    const twist = Math.atan2(axis.dot(from.clone().cross(to)), from.dot(to));
    wrists[index].quaternion.setFromAxisAngle(axis, twist);
  });
  const trouserPositions = trousers.geometry.getAttribute("position");
  const active = [...new Set(trousers.geometry.index!.array)];
  const floor = Math.min(...active.map((vertex) => trouserPositions.getY(vertex)));
  const ankles = [-1, 1].map((side) => {
    const hem = active.filter((vertex) => trouserPositions.getX(vertex) * side > 0 && trouserPositions.getY(vertex) < floor + 0.015);
    const center = new THREE.Vector3();
    hem.forEach((vertex) => center.add(new THREE.Vector3().fromBufferAttribute(trouserPositions, vertex)));
    return center.divideScalar(hem.length);
  });
  return { mesh, clothes, trousers, ankles, skeleton, head, shoulders, elbows, wrists, data };
}
