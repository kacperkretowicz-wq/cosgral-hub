"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "main .hub-tile, main .surface, main .surface-list";

function updateInView() {
  const nodes = [...document.querySelectorAll(SELECTOR)];
  const bandTop = 0.2 * window.innerHeight;
  const bandBottom = 0.62 * window.innerHeight;
  const bandMid = (bandTop + bandBottom) / 2;

  let best: Element | null = null;
  let bestDist = Infinity;

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const overlap =
      Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
    if (overlap < 28) continue;
    const center =
      (Math.max(rect.top, 0) + Math.min(rect.bottom, window.innerHeight)) / 2;
    const dist = Math.abs(center - bandMid);
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }

  for (const node of nodes) {
    node.classList.toggle("is-in-view", node === best);
  }
}

/** On touch devices: the tile nearest the scroll focus gently lifts. */
export function TileScrollLift() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.matchMedia("(hover: none), (pointer: coarse)").matches) {
      return;
    }

    document.documentElement.classList.add("tile-scroll-lift");

    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateInView();
        ticking = false;
      });
    };

    const main = document.querySelector("main");
    const mo = main
      ? new MutationObserver(() => onScrollOrResize())
      : null;
    mo?.observe(main!, { childList: true, subtree: true });

    const t1 = window.setTimeout(updateInView, 60);
    const t2 = window.setTimeout(updateInView, 400);

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      mo?.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      document.documentElement.classList.remove("tile-scroll-lift");
      document.querySelectorAll(SELECTOR).forEach((el) => {
        el.classList.remove("is-in-view");
      });
    };
  }, [pathname]);

  return null;
}
