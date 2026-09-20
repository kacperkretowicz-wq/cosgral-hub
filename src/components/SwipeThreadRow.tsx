"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  active?: boolean;
  title: string;
  subtitle?: string;
  meta?: string;
  onSelect: () => void;
  onTrash: () => void;
  trashMode?: boolean;
  /** When true, full swipe commits immediately (Gmail). */
  swipeCommits?: boolean;
};

/** Gmail-like: swipe left reveals delete on the right (mobile). Desktop: hover Usuń. */
const OPEN = 88;

export function SwipeThreadRow({
  active,
  title,
  subtitle,
  meta,
  onSelect,
  onTrash,
  trashMode,
  swipeCommits = true,
}: Props) {
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"undecided" | "h" | "v">("undecided");
  const dragging = useRef(false);
  const oxRef = useRef(0);
  const [ox, setOx] = useState(0);
  const [open, setOpen] = useState(false);

  const setOffset = (v: number) => {
    oxRef.current = v;
    setOx(v);
  };

  const reset = () => {
    setOffset(0);
    setOpen(false);
  };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashMode, title]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Desktop mouse: don't start swipe — use hover button
    if (e.pointerType === "mouse") return;
    if (e.button !== 0) return;
    dragging.current = true;
    axis.current = "undecided";
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") {
        dragging.current = false;
        return;
      }
    }
    if (axis.current !== "h") return;

    // Swipe left → negative translate (Gmail)
    const base = open ? -OPEN : 0;
    const next = Math.max(-OPEN, Math.min(0, base + dx));
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!dragging.current && axis.current !== "h") {
      dragging.current = false;
      return;
    }
    dragging.current = false;
    const current = oxRef.current;

    // Full swipe commit (Gmail)
    if (swipeCommits && current <= -OPEN * 0.72) {
      reset();
      onTrash();
      return;
    }

    const shouldOpen = current <= -OPEN * 0.4;
    setOpen(shouldOpen);
    setOffset(shouldOpen ? -OPEN : 0);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl">
      {/* Delete rail — right side (Gmail) */}
      <div
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-red-500/90 md:hidden"
        aria-hidden={ox > -8 && !open}
      >
        <button
          type="button"
          aria-label={trashMode ? "Usuń na zawsze" : "Do kosza"}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white"
          onClick={(e) => {
            e.stopPropagation();
            reset();
            onTrash();
          }}
        >
          Usuń
        </button>
      </div>

      <div
        className={`relative z-[1] flex items-stretch transition-colors ${
          active ? "bg-white/15" : "bg-black group-hover:bg-white/[0.04]"
        }`}
        style={{
          transform: `translateX(${ox}px)`,
          transition: dragging.current
            ? "none"
            : "transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => {
            if (Math.abs(oxRef.current) > 8 || open) {
              reset();
              return;
            }
            onSelect();
          }}
          className="min-w-0 flex-1 touch-pan-y px-3 py-3 text-left text-sm"
        >
          <div className="font-medium text-white">{title}</div>
          {subtitle ? (
            <div className="truncate text-xs text-white/40">{subtitle}</div>
          ) : null}
          {meta ? <div className="text-[10px] text-white/30">{meta}</div> : null}
        </button>

        {/* Desktop: system-style Usuń on hover */}
        <div className="hidden shrink-0 items-center pr-2 md:flex md:opacity-0 md:transition md:group-hover:opacity-100 md:focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              onTrash();
            }}
          >
            Usuń
          </Button>
        </div>
      </div>
    </div>
  );
}
