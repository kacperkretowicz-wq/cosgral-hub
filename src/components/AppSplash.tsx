"use client";

import { useEffect, useState } from "react";
import { CosgralLogo } from "@/components/CosgralLogo";

const SPLASH_MS = 1600;
const FADE_MS = 420;

export function AppSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? 400 : SPLASH_MS;
    const fade = reduced ? 180 : FADE_MS;

    const fadeTimer = window.setTimeout(() => setFading(true), hold);
    const hideTimer = window.setTimeout(() => setVisible(false), hold + fade);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`app-splash${fading ? " app-splash--out" : ""}`}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Ładowanie aplikacji Cosgral</span>
      <div className="app-splash__logo">
        <CosgralLogo size={96} priority className="app-splash__pulse" />
      </div>
    </div>
  );
}
