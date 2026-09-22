"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Port of cosgral-agency `site-chat-cube.js` + `cube-shape.js` (live chat FAB). */
export function CosgralChatCube({ dimmed = false }: { dimmed?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimmedRef = useRef(dimmed);
  dimmedRef.current = dimmed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MOBILE = window.matchMedia("(max-width: 900px)").matches;
    const HALF = 1.35;
    const CUBE_SCALE = MOBILE ? 0.72 : 0.76;
    const SHELL_OP = 0.45;
    const EDGE_OP = 0.24;
    const LOOK = MOBILE ? 0.48 : 0.58;
    const IDLE_SPIN = MOBILE ? 0.2 : 0.26;
    const OPEN_DIM = 0.58;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
      premultipliedAlpha: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
    camera.position.set(0, 0.02, MOBILE ? 9.4 : 8.9);

    const root = new THREE.Group();
    root.scale.setScalar(CUBE_SCALE);
    scene.add(root);

    const boxGeo = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2, 5, 5, 5);
    const shell = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0x080808,
        transparent: true,
        opacity: SHELL_OP,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo, 72),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: EDGE_OP,
        depthWrite: false,
      }),
    );

    const randomOnCube = (h: number): [number, number, number] => {
      const face = Math.floor(Math.random() * 6);
      const a = (Math.random() - 0.5) * 2 * h;
      const b = (Math.random() - 0.5) * 2 * h;
      if (face === 0) return [h, a, b];
      if (face === 1) return [-h, a, b];
      if (face === 2) return [a, h, b];
      if (face === 3) return [a, -h, b];
      if (face === 4) return [a, b, h];
      return [a, b, -h];
    };

    const SURFACE = 900;
    const sPos = new Float32Array(SURFACE * 3);
    const sSize = new Float32Array(SURFACE);
    for (let si = 0; si < SURFACE; si++) {
      const sp = randomOnCube(HALF);
      sPos[si * 3] = sp[0];
      sPos[si * 3 + 1] = sp[1];
      sPos[si * 3 + 2] = sp[2];
      sSize[si] = (0.45 + Math.random() * 1.6) * 1.15;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

    const sMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uFade: { value: 1 },
        uAlphaMul: { value: 1 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uFade;
        uniform float uAlphaMul;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          float pulse = sin(uTime * 0.55 + pos.y * 4.0 + pos.x * 3.0) * 0.012;
          pos += normalize(pos + 0.0001) * pulse;
          float dist = length(pos.xy - uMouse * 1.4);
          float ripple = sin(dist * 9.0 - uTime * 2.8) * smoothstep(2.6, 0.0, dist) * 0.07;
          pos.xy += normalize(pos.xy + 0.0001) * ripple;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (190.0 / -mv.z) * (1.0 + smoothstep(2.2, 0.0, dist) * 0.75);
          gl_Position = projectionMatrix * mv;
          vAlpha = (0.16 + smoothstep(2.8, 0.0, dist) * 0.25) * uFade * uAlphaMul;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(0.7, 0.7, 0.72, vAlpha * glow * 0.5);
        }
      `,
    });

    root.add(shell, edges, new THREE.Points(sGeo, sMat));

    let spin = 0.35;
    let leanX = 0;
    let leanY = 0;
    let targetLeanX = 0;
    let targetLeanY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let visualFade = 1;
    let running = true;
    let last = performance.now();
    let ptrX = window.innerWidth * 0.5;
    let ptrY = window.innerHeight * 0.5;

    const clamp = (v: number, a: number, b: number) =>
      Math.max(a, Math.min(b, v));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };

    const onMove = (e: PointerEvent) => {
      ptrX = e.clientX;
      ptrY = e.clientY;
    };

    const frame = (now: number) => {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;

      const open = dimmedRef.current;
      if (open) {
        targetLeanX = 0.18;
        targetLeanY = -0.12;
        mouseX = 0;
        mouseY = 0;
      } else {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const dx = (ptrX - cx) / Math.max(window.innerWidth * 0.45, 1);
        const dy = (ptrY - cy) / Math.max(window.innerHeight * 0.45, 1);
        targetLeanY = clamp(dx, -1.1, 1.1) * LOOK;
        targetLeanX = clamp(-dy, -1.1, 1.1) * LOOK * 0.82;
        mouseX = clamp((ptrX - cx) / Math.max(rect.width * 0.55, 1), -1.2, 1.2);
        mouseY = clamp(
          -(ptrY - cy) / Math.max(rect.height * 0.55, 1),
          -1.2,
          1.2,
        );
      }

      const follow = 1 - Math.pow(0.001, dt);
      leanX += (targetLeanX - leanX) * Math.min(1, follow * 12);
      leanY += (targetLeanY - leanY) * Math.min(1, follow * 12);
      if (!open) spin += dt * IDLE_SPIN;

      root.rotation.x = leanX;
      root.rotation.y = (open ? 0.22 : spin * 0.5) + leanY;
      root.rotation.z = leanY * -0.12 + leanX * 0.04;

      const fadeTarget = open ? OPEN_DIM : 1;
      visualFade += (fadeTarget - visualFade) * Math.min(1, follow * 8);
      sMat.uniforms.uTime.value = spin;
      sMat.uniforms.uMouse.value.set(mouseX, mouseY);
      sMat.uniforms.uFade.value = visualFade;
      (shell.material as THREE.MeshBasicMaterial).opacity = SHELL_OP * visualFade;
      (edges.material as THREE.LineBasicMaterial).opacity = EDGE_OP * visualFade;
      renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    ro?.observe(canvas.parentElement || canvas);
    requestAnimationFrame(frame);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      ro?.disconnect();
      sGeo.dispose();
      boxGeo.dispose();
      (shell.material as THREE.Material).dispose();
      (edges.material as THREE.Material).dispose();
      sMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-cg-chat-cube
      className="pointer-events-none h-full w-full"
      aria-hidden
    />
  );
}
