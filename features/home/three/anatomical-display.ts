import scan from "./medical-scan.json";

type Triangle = { points: number[][]; depth: number; light: number };

/** Project the actual anatomical mesh into a simulated imaging display. */
export function projectAnatomy(yaw: number): Triangle[] {
  const cosine = Math.cos(yaw); const sine = Math.sin(yaw);
  const points: number[][] = [];
  for (let index = 0; index < scan.positions.length; index += 3) {
    const x = scan.positions[index] * scan.scale; const y = scan.positions[index + 1] * scan.scale; const z = scan.positions[index + 2] * scan.scale;
    points.push([x * cosine + z * sine, y, -x * sine + z * cosine]);
  }
  const triangles: Triangle[] = [];
  for (let index = 0; index < scan.indices.length; index += 3) {
    const vertices = scan.indices.slice(index, index + 3).map((vertex) => points[vertex]);
    const [a, b, c] = vertices;
    const ab = b.map((value, axis) => value - a[axis]); const ac = c.map((value, axis) => value - a[axis]);
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (normal[2] <= 0) continue;
    const length = Math.hypot(...normal) || 1;
    const light = Math.max(0.12, (-normal[0] * 0.4 + normal[1] * 0.3 + normal[2] * 0.85) / length);
    triangles.push({ points: vertices, depth: (a[2] + b[2] + c[2]) / 3, light });
  }
  return triangles.sort((a, b) => a.depth - b.depth);
}

const views = new Map<number, Triangle[]>();
export function drawAnatomicalFigure(context: CanvasRenderingContext2D, x: number, y: number, scale: number, yaw: number) {
  if (!views.has(yaw)) views.set(yaw, projectAnatomy(yaw));
  context.save(); context.translate(x, y); context.scale(scale, -scale);
  for (const triangle of views.get(yaw)!) {
    const tone = triangle.light;
    context.beginPath();
    triangle.points.forEach((point, index) => { if (index === 0) context.moveTo(point[0], point[1]); else context.lineTo(point[0], point[1]); });
    context.closePath();
    context.fillStyle = `rgb(${Math.round(41 + tone * 139)},${Math.round(88 + tone * 130)},${Math.round(92 + tone * 123)})`;
    context.fill(); context.strokeStyle = context.fillStyle; context.lineWidth = 0.0005; context.stroke();
  }
  context.restore();
}
