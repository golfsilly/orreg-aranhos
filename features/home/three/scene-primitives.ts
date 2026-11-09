import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type Surface = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial;
export type Point = [number, number, number];

export function surface(color: THREE.ColorRepresentation, roughness = 0.6, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function fabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const pixels = context.createImageData(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const offset = (y * 128 + x) * 4;
      const weave = 125 + Math.sin(x * Math.PI / 2) * 18 + Math.cos(y * Math.PI / 2) * 18 + Math.sin(x * 17 + y * 31) * 8;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = weave;
      pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function box(parent: THREE.Object3D, size: Point, position: Point, material: Surface, radius = 0.03) {
  const geometry = radius > 0
    ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((value) => value / 3)))
    : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = Math.max(...size) > 0.1;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function sphere(parent: THREE.Object3D, scale: Point, position: Point, material: Surface) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.castShadow = Math.max(...scale) > 0.06;
  parent.add(mesh);
  return mesh;
}

export function rod(parent: THREE.Object3D, start: Point, end: Point, radius: number, material: Surface, topRadius = radius) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, radius, a.distanceTo(b), 14), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  mesh.castShadow = radius > 0.025;
  parent.add(mesh);
  return mesh;
}

export function tube(parent: THREE.Object3D, points: Point[], radius: number, material: Surface) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 7, false), material);
  parent.add(mesh);
  return mesh;
}

export function ring(parent: THREE.Object3D, radius: number, thickness: number, position: Point, material: Surface) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 7, 28), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

export function labelTexture(text: string, foreground = "#d9efe7", background = "#15372e", width = 512, height = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.fillStyle = foreground;
    context.font = `500 ${Math.floor(height * 0.28)}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function label(parent: THREE.Object3D, text: string, width: number, height: number, position: Point, foreground?: string, background?: string) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: labelTexture(text, foreground, background), side: THREE.DoubleSide }));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/** Smooth cloth rings preserve adult proportions, with small folds in the fabric. */
export function garment(rings: [number, number, number][], color: Surface, folds = 0.005) {
  const segments = 40;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  rings.forEach(([height, width, depth], row) => {
    for (let column = 0; column <= segments; column++) {
      const angle = column / segments * Math.PI * 2;
      const fold = Math.sin(angle * 10 + row * 0.7) * folds + Math.sin(angle * 17) * folds * 0.3;
      vertices.push(Math.cos(angle) * (width + fold), height, Math.sin(angle) * (depth + fold));
      uvs.push(column / segments, row / (rings.length - 1));
      if (row < rings.length - 1 && column < segments) {
        const current = row * (segments + 1) + column;
        indices.push(current, current + segments + 1, current + 1, current + 1, current + segments + 1, current + segments + 2);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, color);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
