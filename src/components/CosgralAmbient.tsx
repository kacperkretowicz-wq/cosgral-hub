"use client";

import { useEffect, useRef } from "react";

const VERT = `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
  precision mediump float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;

  float wave(vec2 p, float t) {
    float w = 0.0;
    float amp = 1.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      p.x += sin(p.y * (1.4 + fi * 0.35) + t * 0.7) * 0.18;
      w += sin(p.x * (1.8 + fi * 0.7) + p.y * 1.1 + t * (0.5 + fi * 0.08)) * amp;
      amp *= 0.58;
    }
    return w * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    vec2 m = uMouse * 0.5 + 0.5;
    vec2 toM = uv - m;
    float mDist = length(toM);
    float mForce = smoothstep(0.62, 0.0, mDist);

    vec2 p = uv * vec2(2.8, 2.0);
    p += normalize(toM + 0.0001) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);
    p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;

    float t = uTime * 0.14;
    float w = wave(p, t);
    float ridge = pow(1.0 - abs(sin(w * 4.2 + t * 0.25)), 6.0);

    vec3 base = vec3(0.055, 0.055, 0.055);
    vec3 dim = vec3(0.24, 0.24, 0.24);
    vec3 mid = vec3(0.58, 0.58, 0.58);
    vec3 hi = vec3(1.0, 1.0, 1.0);

    vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);
    ribbon = mix(ribbon, hi, ridge * 0.52);

    vec3 col = base;
    col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);
    col += hi * pow(ridge, 14.0) * 0.32;
    col += mid * mForce * 0.16;
    col += hi * mForce * ridge * 0.12;

    float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));
    col *= 0.58 + vignette * 0.42;
    col = ((col - 0.5) * 1.04 + 0.5) * 0.78;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Liquid-wave background from cosgral.pl (home-ambient-bg.js). */
export function CosgralAmbient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = (canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");

    const mobile =
      window.matchMedia("(max-width: 900px)").matches ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const dprCap = mobile ? 0.6 : 0.66;
    const skipN = mobile ? 2 : 1;

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let running = true;
    let frameSkip = 0;
    const start = performance.now();

    const resize = () => {
      const w = Math.round(window.innerWidth * dprCap);
      const h = Math.round(window.innerHeight * dprCap);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = 1 - (e.clientY / window.innerHeight) * 2;
      mouse.tx = nx;
      mouse.ty = ny;
      blurRef.current?.style.setProperty(
        "transform",
        `translate3d(${e.clientX}px, ${e.clientY}px, 0)`,
      );
    };

    const frame = (now: number) => {
      if (!running) return;
      frameSkip += 1;
      if (skipN > 1 && frameSkip % skipN !== 0) {
        requestAnimationFrame(frame);
        return;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    requestAnimationFrame(frame);

    const onVis = () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse 140% 90% at 50% 38%, #0e0e0e 0%, #040404 42%, #000 100%)",
        }}
      />
      <div
        ref={blurRef}
        className="cosgral-cursor-blur absolute left-0 top-0"
      />
      <div className="absolute inset-0 bg-[rgba(3,3,3,0.28)]" />
    </div>
  );
}
