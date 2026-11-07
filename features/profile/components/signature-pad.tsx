"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Eraser, PenLine } from "lucide-react";

export function SignaturePad({ onSave, disabled }: { onSave: (blob: Blob) => void; disabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  function position(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * event.currentTarget.width / bounds.width, y: (event.clientY - bounds.top) * event.currentTarget.height / bounds.height };
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = position(event);
    ctx.strokeStyle = "#14241b"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(point.x + 0.1, point.y + 0.1); ctx.stroke();
    drawing.current = true; setHasInk(true);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = position(event); ctx.lineTo(point.x, point.y); ctx.stroke();
  }
  function clear() { const canvas = canvasRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setHasInk(false); }
  return <div className="space-y-3"><canvas ref={canvasRef} width={1200} height={400} aria-label="พื้นที่เขียนลายเซ็น ใช้เมาส์ ปากกา หรือสัมผัส หากไม่สะดวกสามารถอัปโหลดภาพแทนได้" onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} onLostPointerCapture={() => { drawing.current = false; }} className="aspect-[3/1] w-full touch-none rounded-xl border border-dashed border-emerald-700/30 bg-white shadow-inner" />
    <div className="flex flex-wrap gap-2"><button type="button" disabled={!hasInk || disabled} onClick={() => canvasRef.current?.toBlob((blob) => { if (blob) onSave(blob); }, "image/png")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><PenLine className="size-4" /> บันทึกลายเซ็นที่เขียน</button><button type="button" disabled={!hasInk || disabled} onClick={clear} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50"><Eraser className="size-4" /> ล้างพื้นที่เขียน</button></div>
  </div>;
}
