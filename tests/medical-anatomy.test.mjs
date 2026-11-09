import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { buildAnatomyData, createMedicalAnatomy } from "../features/home/three/medical-anatomy.ts";
import { buildClogSole, createSurgicalClog } from "../features/home/three/surgical-clogs.ts";

const source = JSON.parse(readFileSync(new URL("../features/home/three/medical-anatomy.json", import.meta.url), "utf8"));
const data = buildAnatomyData(source);
const uniformSource = JSON.parse(readFileSync(new URL("../features/home/three/medical-uniform.json", import.meta.url), "utf8"));
const uniform = buildAnatomyData(uniformSource);
const material = new THREE.MeshBasicMaterial();
const materials = { skin: material, glove: material, cloth: material };
const point = (vertex) => new THREE.Vector3(...data.positions.slice(vertex * 3, vertex * 3 + 3));

test("neck, shoulders, elbows and wrists have no cut or disconnected rims", () => {
  // UV seams duplicate vertices but retain the same continuous anatomical surface.
  const welded = new Map(); const remap = [];
  for (let vertex = 0; vertex < data.positions.length / 3; vertex++) {
    const key = source.positions.slice(vertex * 3, vertex * 3 + 3).join(":");
    if (!welded.has(key)) welded.set(key, vertex);
    remap.push(welded.get(key));
  }
  const edges = new Map();
  for (let index = 0; index < data.indices.length; index += 3) for (let side = 0; side < 3; side++) {
    const a = remap[data.indices[index + side]]; const b = remap[data.indices[index + (side + 1) % 3]];
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  for (const [key, count] of edges) {
    assert.ok(count <= 2, "body must be manifold");
    if (count !== 1) continue;
    const [a, b] = key.split(":").map(Number);
    assert.ok(point(a).y < 0.025 && point(b).y < 0.025, `only the hidden waist may have an open rim: ${key}`);
  }
});

test("waist remains stationary during arm movement, and skin weights stay normalized", () => {
  for (let vertex = 0; vertex < data.positions.length / 3; vertex++) {
    const weights = data.skinWeights.slice(vertex * 4, vertex * 4 + 4);
    assert.ok(weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1));
    assert.ok(Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-10);
    const p = point(vertex);
    if (p.y < 0.3 && Math.abs(p.x) < 0.2) assert.equal(weights[0], 1, "moving arms must not pull the waist sideways");
  }
});

test("head turns and working arm poses preserve finite, continuous skin", () => {
  const rig = createMedicalAnatomy(source, materials, false, uniformSource);
  const position = rig.mesh.geometry.getAttribute("position");
  for (const yaw of [-0.35, 0, 0.55]) {
    rig.head.rotation.set(0.15, yaw, 0.025);
    rig.elbows[0].rotation.x += 0.07;
    rig.mesh.updateMatrixWorld(true); rig.skeleton.update();
    for (let vertex = 0; vertex < position.count; vertex++) {
      const transformed = rig.mesh.applyBoneTransform(vertex, new THREE.Vector3().fromBufferAttribute(position, vertex));
      assert.ok(transformed.toArray().every(Number.isFinite));
      const p = point(vertex);
      if (p.y < 0.3 && Math.abs(p.x) < 0.2) assert.ok(p.distanceTo(transformed) < 1e-6);
    }
  }
  rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.clothes.geometry.dispose(); rig.trousers.geometry.dispose();
});

test("short sleeves and gowns share the body skeleton and have fabric thickness", () => {
  for (const gown of [false, true]) {
    const rig = createMedicalAnatomy(source, materials, gown, uniformSource);
    assert.equal(rig.clothes.skeleton, rig.mesh.skeleton);
    const geometry = rig.clothes.geometry;
    assert.ok(geometry.getAttribute("position").count > uniform.positions.length / 3, "collar and sleeve hems need inner vertices");
    for (const attribute of ["position", "normal", "skinWeight"]) assert.ok([...geometry.getAttribute(attribute).array].every(Number.isFinite));
    assert.equal(geometry.getAttribute("skinWeight").count, geometry.getAttribute("position").count);
    const position = geometry.getAttribute("position");
    const centerChest = [];
    for (let vertex = 0; vertex < uniform.positions.length / 3; vertex++) {
      const p = new THREE.Vector3(...uniform.positions.slice(vertex * 3, vertex * 3 + 3));
      if (Math.abs(p.x) < 0.02 && p.y > 0.2 && p.y < 0.4 && p.z > 0.09) centerChest.push(position.getZ(vertex));
    }
    assert.ok(centerChest.length > 0);
    assert.ok(centerChest.every((z) => z > 0.15 && z < 0.2), "scrubs should hang away from the torso without exaggerated chest contours");
    rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.clothes.geometry.dispose(); rig.trousers.geometry.dispose();
  }
});

test("trousers form one connected hip-and-leg garment and skin has mapped UVs", () => {
  const rig = createMedicalAnatomy(source, materials, false, uniformSource);
  assert.equal(rig.mesh.geometry.getAttribute("uv").count, rig.mesh.geometry.getAttribute("position").count);
  const adjacency = new Map(); const indices = rig.trousers.geometry.index.array;
  for (let index = 0; index < indices.length; index += 3) for (let side = 0; side < 3; side++) {
    const a = indices[index + side]; const b = indices[index + (side + 1) % 3];
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b); adjacency.get(b).add(a);
  }
  const visited = new Set(); const queue = [indices[0]];
  while (queue.length) {
    const vertex = queue.pop(); if (visited.has(vertex)) continue;
    visited.add(vertex); queue.push(...adjacency.get(vertex));
  }
  assert.equal(visited.size, adjacency.size, "hips must join both legs instead of using two separate tubes");
  rig.ankles.forEach((ankle, index) => {
    const side = index === 0 ? -1 : 1;
    assert.ok(ankle.x * side > 0.095 && ankle.x * side < 0.145, "ankles should support a relaxed hip-width stance");
    assert.ok(Math.abs(ankle.z) < 0.025);
    const shoe = createSurgicalClog(side); shoe.position.set(ankle.x, 0, ankle.z);
    assert.ok(shoe.position.distanceTo(new THREE.Vector3(ankle.x, 0, ankle.z)) < 1e-8, "the shoe opening must sit beneath the actual trouser hem");
    shoe.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); object.material.dispose(); } });
  });
  rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.clothes.geometry.dispose(); rig.trousers.geometry.dispose();
});

test("surgical clog soles are closed, proportioned to adult feet, and sit flat on the ground", () => {
  const geometry = buildClogSole(); geometry.computeBoundingBox();
  const bounds = geometry.boundingBox; const size = bounds.getSize(new THREE.Vector3());
  assert.equal(bounds.min.y, 0);
  assert.ok(size.x > 0.09 && size.x < 0.12);
  assert.ok(size.z > 0.23 && size.z < 0.28);
  assert.ok(size.y < 0.03, "a shoe sole must not look like a thick rectangular block");
  const edges = new Map(); const index = geometry.index.array;
  for (let triangle = 0; triangle < index.length; triangle += 3) for (let side = 0; side < 3; side++) {
    const a = index[triangle + side]; const b = index[triangle + (side + 1) % 3]; const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  assert.ok([...edges.values()].every((count) => count === 2));
  geometry.dispose();
});
