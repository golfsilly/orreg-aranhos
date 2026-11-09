"use client";

import { useEffect, useRef } from "react";
import { createSceneRuntime, type SceneRuntime, type SceneView } from "../three/scene-runtime";
import type { ZoomRequest } from "../three/scene-views";

export type SceneStatus = "loading" | "ready" | "unavailable";

export default function OperatingRoomCanvas({ paused, view, dark, interactive, resetKey, zoomRequest, onStatusChange }: {
  paused: boolean; view: SceneView; dark: boolean; interactive: boolean; resetKey: number; zoomRequest: ZoomRequest; onStatusChange: (status: SceneStatus) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<SceneRuntime | null>(null);

  useEffect(() => {
    if (!canvas.current || !host.current) return;
    try {
      runtime.current = createSceneRuntime(canvas.current, host.current, () => onStatusChange("unavailable"));
      onStatusChange("ready");
    } catch {
      onStatusChange("unavailable");
    }
    return () => { runtime.current?.dispose(); runtime.current = null; };
  }, [onStatusChange]);
  useEffect(() => { runtime.current?.setPaused(paused); }, [paused]);
  useEffect(() => { runtime.current?.setTheme(dark); }, [dark]);
  useEffect(() => { runtime.current?.setInteractive(interactive); }, [interactive]);
  useEffect(() => { runtime.current?.focus(view); }, [view, resetKey]);
  useEffect(() => { if (zoomRequest.sequence > 0) runtime.current?.zoom(zoomRequest.direction); }, [zoomRequest]);

  return <div ref={host} className="absolute inset-0"><canvas ref={canvas} role="img" aria-label="ฉากจำลองห้องผ่าตัดสามมิติ พร้อมศัลยแพทย์ วิสัญญีแพทย์ พยาบาลส่งเครื่องมือ และพยาบาลช่วยเหลือ" className="block size-full touch-pan-y outline-none" /></div>;
}
