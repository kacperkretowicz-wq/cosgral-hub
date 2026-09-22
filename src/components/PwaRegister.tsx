"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Force update after deploy so push handler is current
        void reg.update();
      })
      .catch(() => {});
  }, []);
  return null;
}
