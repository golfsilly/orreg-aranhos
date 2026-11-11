"use client";

import {
  Activity,
  Hand,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { SceneView, ZoomRequest } from "../three/scene-views";
import type { SceneStatus } from "./operating-room-canvas";

const OperatingRoomCanvas = dynamic(() => import("./operating-room-canvas"), {
  ssr: false,
});
const cameraViews: { id: SceneView; label: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "team", label: "ศัลยแพทย์" },
  { id: "anesthesia", label: "วิสัญญี" },
  { id: "scrub", label: "Scrub Nurse" },
  { id: "nurse", label: "พยาบาล" },
  { id: "equipment", label: "อุปกรณ์" },
];
const iconButton =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-primary transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 sm:size-9 dark:text-primary dark:hover:bg-accent";

export function OperatingRoomViewer() {
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<SceneStatus>("loading");
  const [paused, setPaused] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [view, setView] = useState<SceneView>("overview");
  const [resetKey, setResetKey] = useState(0);
  const [zoomRequest, setZoomRequest] = useState<ZoomRequest>({
    sequence: 0,
    direction: "in",
  });
  const onStatusChange = useCallback(
    (next: SceneStatus) => setStatus(next),
    [],
  );
  const isPaused = paused || reducedMotion === true;
  const available = status === "ready";
  function changeView(next: SceneView) {
    setView(next);
    setResetKey((value) => value + 1);
  }
  function zoom(direction: "in" | "out") {
    setZoomRequest((current) => ({
      sequence: current.sequence + 1,
      direction,
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.15 }}
      className="min-w-0"
      id="operating-theatre"
    >
      <div
        className="relative isolate h-[460px] overflow-hidden rounded-[28px] border border-border bg-accent shadow-md sm:h-[580px] sm:rounded-[36px] lg:h-[660px] xl:h-[700px] dark:border-border dark:bg-accent"
        role="region"
        aria-label="สำรวจห้องผ่าตัดจำลอง 3D"
        aria-describedby="scene-description"
      >
        <OperatingRoomCanvas
          paused={isPaused}
          interactive={interactive}
          view={view}
          dark={resolvedTheme === "dark"}
          resetKey={resetKey}
          zoomRequest={zoomRequest}
          onStatusChange={onStatusChange}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-background/95 to-transparent px-4 pt-4 pb-12 sm:px-6 sm:pt-5 dark:from-background/95">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-foreground sm:text-[10px] dark:text-primary">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-40 motion-safe:animate-ping" />
                <span className="relative size-1.5 rounded-full bg-emerald-600" />
              </span>
              INTEGRATED OPERATING THEATRE
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-white/55 px-2 py-1 text-[8px] font-semibold tracking-[0.08em] text-primary backdrop-blur-sm sm:px-2.5 sm:text-[9px] dark:border-border dark:bg-accent/70 dark:text-primary">
            3D SIMULATION
          </span>
        </div>
        {status === "loading" && (
          <div
            className="absolute inset-0 z-20 grid place-items-center bg-accent/90 dark:bg-accent/90"
            role="status"
          >
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/15 bg-primary/5">
                <Activity className="size-6 text-primary motion-safe:animate-pulse" />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">
                กำลังเตรียมห้องผ่าตัด 3D
              </p>
              <div className="mx-auto mt-3 h-0.5 w-28 overflow-hidden rounded-full bg-primary/10">
                <div className="h-full w-1/2 rounded-full bg-primary/60 motion-safe:animate-pulse" />
              </div>
            </div>
          </div>
        )}
        {status === "unavailable" && (
          <div
            className="absolute inset-0 z-20 grid place-items-center bg-accent px-6 dark:bg-accent"
            role="status"
          >
            <div className="max-w-xs text-center">
              <Activity className="mx-auto size-12 text-primary/50" />
              <p className="mt-5 text-base font-semibold">ห้องผ่าตัด 3D</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                เบราว์เซอร์นี้ยังแสดงภาพ 3D ไม่ได้ คุณสามารถเข้าสู่ระบบและใช้งาน
                OR-Reg ได้ตามปกติ
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-background via-card/95 to-transparent p-3 pt-12 sm:p-5 sm:pt-14 dark:from-background dark:via-card/95">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-muted-foreground">
              <Hand className="size-3 shrink-0" />
              {interactive
                ? "ลากเพื่อหมุน · ใช้ + / − เพื่อซูม"
                : "เลือกบุคลากรเพื่อดูใกล้ · ใช้ + / − เพื่อซูม"}
            </span>
            <span className="shrink-0 text-[9px] tracking-widest text-muted-foreground dark:text-muted-foreground">
              OR / 01
            </span>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-lg backdrop-blur-xl dark:border-border dark:bg-card/90">
            <div
              role="group"
              aria-label="เลือกบุคลากรหรือมุมกล้อง"
              className="grid min-w-0 grid-cols-3 gap-1 sm:grid-cols-6"
            >
              {cameraViews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!available}
                  aria-pressed={view === item.id}
                  onClick={() => changeView(item.id)}
                  className={`min-h-9 min-w-0 cursor-pointer rounded-xl px-1.5 text-[10px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:text-[11px] ${view === item.id ? "bg-primary text-white shadow-sm dark:bg-accent dark:text-primary" : "text-primary hover:bg-accent dark:text-primary dark:hover:bg-accent"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border px-1 pt-1.5 dark:border-border">
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[10px] font-medium text-muted-foreground dark:text-muted-foreground">
                  ซูม
                </span>
                <button
                  type="button"
                  aria-label="ซูมออก"
                  title="ซูมออก"
                  disabled={!available}
                  onClick={() => zoom("out")}
                  className={iconButton}
                >
                  <Minus className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="ซูมเข้า"
                  title="ซูมเข้า"
                  disabled={!available}
                  onClick={() => zoom("in")}
                  className={iconButton}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={!available}
                aria-label={
                  interactive ? "ปิดโหมดหมุนกล้อง" : "เปิดโหมดหมุนกล้อง"
                }
                aria-pressed={interactive}
                onClick={() => setInteractive((value) => !value)}
                className={`inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold transition focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 sm:min-h-9 sm:px-3 ${interactive ? "bg-primary/15 text-primary" : "text-primary hover:bg-accent dark:text-primary dark:hover:bg-accent"}`}
              >
                <Maximize2 className="size-3.5" />
                <span className="hidden min-[420px]:inline">หมุนดู</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!available || reducedMotion === true}
                  aria-label={
                    isPaused ? "เล่นการเคลื่อนไหว" : "หยุดการเคลื่อนไหว"
                  }
                  title={
                    reducedMotion
                      ? "เคารพการตั้งค่าลดการเคลื่อนไหวของอุปกรณ์"
                      : isPaused
                        ? "เล่นต่อ"
                        : "หยุดภาพเคลื่อนไหว"
                  }
                  onClick={() => setPaused((value) => !value)}
                  className={iconButton}
                >
                  {isPaused ? (
                    <Play className="size-3.5" />
                  ) : (
                    <Pause className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={!available}
                  aria-label="คืนมุมกล้องเริ่มต้น"
                  title="คืนมุมกล้อง"
                  onClick={() => {
                    changeView("overview");
                    setInteractive(false);
                  }}
                  className={iconButton}
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-[10px] text-muted-foreground sm:text-[11px]">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            ศัลยแพทย์
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            วิสัญญีแพทย์
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            ทีมพยาบาล
          </span>
        </div>
        <p id="scene-description" className="m-0">
          ฉากและค่าบนจอเป็นข้อมูลจำลอง
        </p>
      </div>
    </motion.div>
  );
}
