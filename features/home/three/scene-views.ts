export type SceneView = "overview" | "team" | "anesthesia" | "scrub" | "nurse" | "equipment";
export type ZoomRequest = { sequence: number; direction: "in" | "out" };
type CameraPreset = { camera: [number, number, number]; target: [number, number, number]; azimuth: [number, number]; distance: [number, number] };

export const sceneViews: Record<SceneView, CameraPreset> = {
  overview: { camera: [6.4, 4.8, 7.5], target: [0, 1.1, -0.05], azimuth: [-0.1, 1.51], distance: [3.4, 12.5] },
  team: { camera: [3.65, 2.8, 3.9], target: [-0.1, 1.19, 0.08], azimuth: [-0.1, 1.51], distance: [2, 8] },
  anesthesia: { camera: [4.4, 2.75, 1.75], target: [0.8, 1.35, -1.15], azimuth: [-0.1, 1.51], distance: [1.7, 6.5] },
  scrub: { camera: [-1, 2.2, 1.55], target: [0.77, 1.3, 0.35], azimuth: [-1.6, -0.35], distance: [1.4, 4.5] },
  nurse: { camera: [0.25, 1.95, -0.25], target: [-1.4, 1.22, 1.82], azimuth: [1.95, 2.9], distance: [1.5, 4.2] },
  equipment: { camera: [4.5, 3, 4.2], target: [1.1, 1.3, 0], azimuth: [-0.1, 1.51], distance: [2.4, 7] },
};
