// Convert the CC0 HM08 body and its clothing helper into web scene assets.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const source = readFileSync(process.argv[2] ?? ".tmp-home/base.obj", "utf8");
const vertices = []; const texcoords = []; const body = []; const scan = []; const uniform = []; const joints = new Map();
let group = "";
for (const line of source.split("\n")) {
  const values = line.trim().split(/\s+/);
  if (values[0] === "v") vertices.push(values.slice(1).map(Number));
  if (values[0] === "vt") texcoords.push(values.slice(1, 3).map(Number));
  if (values[0] === "g") group = values[1];
  if (values[0] !== "f") continue;
  const corners = values.slice(1).map((value) => value.split("/").map((part) => Number(part) - 1));
  const face = corners.map(([vertex]) => vertex);
  if (group === "body") scan.push({ face, uv: corners.map(([, uv]) => texcoords[uv]) });
  if (group === "body" && face.every((index) => vertices[index][1] > -0.1)) body.push({ face, uv: corners.map(([, uv]) => texcoords[uv]) });
  if (group === "helper-tights" && face.every((index) => vertices[index][1] > -7.35)) uniform.push({ face, uv: corners.map(([, uv]) => texcoords[uv]) });
  if (group.startsWith("joint-")) {
    if (!joints.has(group)) joints.set(group, new Set());
    face.forEach((index) => joints.get(group).add(index));
  }
}
const mean = (points) => points[0].map((_, axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
const toScene = ([x, y, z]) => [x * 0.103, y * 0.103, (z - 0.1) * 0.103];
const joint = (name) => toScene(mean([...joints.get(name)].map((index) => vertices[index])));
const arms = ["r", "l"].map((side) => ({
  shoulder: joint(`joint-${side}-shoulder`), elbow: joint(`joint-${side}-elbow`), wrist: joint(`joint-${side}-hand`),
  index: joint(`joint-${side}-finger-2-1`), middle: joint(`joint-${side}-finger-3-1`), pinky: joint(`joint-${side}-finger-5-1`),
  fingertips: [1, 2, 3, 4, 5].map((finger) => joint(`joint-${side}-finger-${finger}-4`)),
}));

function subdivide(input, sourcePoints, passes) {
  const selected = [...new Set(input.flatMap(({ face }) => face))];
  const remap = new Map(selected.map((index, mapped) => [index, mapped]));
  let points = selected.map((index) => sourcePoints[index]);
  let faces = input.map(({ face, uv }) => ({ face: face.map((index) => remap.get(index)), uv }));
  for (let pass = 0; pass < passes; pass++) {
    const facePoints = faces.map(({ face }) => mean(face.map((index) => points[index])));
    const edges = new Map(); const vertexFaces = points.map(() => []); const vertexEdges = points.map(() => []);
    faces.forEach(({ face }, faceIndex) => face.forEach((index, corner) => {
      vertexFaces[index].push(faceIndex);
      const next = face[(corner + 1) % face.length]; const key = edgeKey(index, next);
      if (!edges.has(key)) {
        edges.set(key, { a: index, b: next, faces: [], index: 0 });
        vertexEdges[index].push(key); vertexEdges[next].push(key);
      }
      edges.get(key).faces.push(faceIndex);
    }));
    const smoothed = points.map((point, index) => {
      const touching = vertexEdges[index].map((key) => edges.get(key));
      const boundary = touching.filter((edge) => edge.faces.length === 1).map((edge) => points[edge.a === index ? edge.b : edge.a]);
      if (boundary.length === 2) return point.map((value, axis) => (6 * value + boundary[0][axis] + boundary[1][axis]) / 8);
      const count = vertexFaces[index].length;
      const faceMean = mean(vertexFaces[index].map((face) => facePoints[face]));
      const edgeMean = mean(touching.map((edge) => mean([points[edge.a], points[edge.b]])));
      return point.map((value, axis) => (faceMean[axis] + 2 * edgeMean[axis] + (count - 3) * value) / count);
    });
    for (const edge of edges.values()) {
      edge.index = smoothed.length;
      smoothed.push(edge.faces.length === 2 ? mean([points[edge.a], points[edge.b], ...edge.faces.map((index) => facePoints[index])]) : mean([points[edge.a], points[edge.b]]));
    }
    const faceStart = smoothed.length; smoothed.push(...facePoints);
    const nextFaces = [];
    faces.forEach(({ face, uv }, faceIndex) => face.forEach((vertex, corner) => {
      const next = (corner + 1) % face.length; const previous = (corner + face.length - 1) % face.length;
      nextFaces.push({ face: [vertex, edges.get(edgeKey(vertex, face[next])).index, faceStart + faceIndex, edges.get(edgeKey(face[previous], vertex)).index], uv: [uv[corner], mean([uv[corner], uv[next]]), mean(uv), mean([uv[previous], uv[corner]])] });
    }));
    points = smoothed; faces = nextFaces;
  }
  return { points: points.map(toScene), faces };
}

function exportMesh(input, output, passes, includeUV) {
  const { points, faces } = subdivide(input, vertices, passes);
  const normals = points.map(() => [0, 0, 0]);
  for (const { face } of faces) for (let corner = 1; corner < face.length - 1; corner++) {
    const ids = [face[0], face[corner], face[corner + 1]]; const [a, b, c] = ids.map((index) => points[index]);
    const ab = b.map((value, axis) => value - a[axis]); const ac = c.map((value, axis) => value - a[axis]);
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    ids.forEach((index) => n.forEach((value, axis) => { normals[index][axis] += value; }));
  }
  normals.forEach((normal) => { const length = Math.hypot(...normal) || 1; normal.forEach((value, axis) => { normal[axis] = value / length; }); });
  const positions = []; const uvs = []; const smoothNormals = []; const indices = []; const mapped = new Map();
  for (const { face, uv } of faces) {
    const corners = face.map((vertex, corner) => {
      const coords = uv[corner]; const key = includeUV ? `${vertex}:${coords.map((value) => Math.round(value * 1e6)).join(":")}` : String(vertex);
      if (!mapped.has(key)) {
        mapped.set(key, positions.length / 3);
        positions.push(...points[vertex].map((value) => Math.round(value * 100000)));
        uvs.push(...coords.map((value) => Math.round(value * 100000)));
        smoothNormals.push(...normals[vertex].map((value) => Math.round(value * 100000)));
      }
      return mapped.get(key);
    });
    for (let corner = 1; corner < corners.length - 1; corner++) indices.push(corners[0], corners[corner], corners[corner + 1]);
  }
  writeFileSync(output, JSON.stringify({ scale: 0.00001, positions, indices, ...(includeUV ? { uvs, normals: smoothNormals } : {}), arms, head: joint("joint-head"), headCenter: toScene([0, 7.08, 0.645]) }) + "\n");
  console.log(`${output}: ${positions.length / 3} vertices, ${indices.length / 3} triangles`);
}
exportMesh(body, "features/home/three/medical-anatomy.json", 1, true);
exportMesh(uniform, "features/home/three/medical-uniform.json", 2, false);
exportMesh(scan, "features/home/three/medical-scan.json", 0, false);
console.log(`Source SHA256: ${createHash("sha256").update(source).digest("hex")}`);
