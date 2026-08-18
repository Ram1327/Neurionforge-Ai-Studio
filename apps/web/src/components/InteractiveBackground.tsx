"use client";

import React, { useEffect, useRef } from "react";

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId: number;

    const COUNT = 46;

    interface Particle {
      x: number;
      y: number;
      r: number;
      speed: number;
      drift: number;
      hue: string;
      alpha: number;
      flicker: number;
    }

    function makeParticle(initial: boolean): Particle {
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : height + Math.random() * 60,
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 0.42 + 0.16,
        drift: (Math.random() - 0.5) * 0.32,
        hue: Math.random() > 0.5 ? "76,141,255" : "159,224,255",
        alpha: Math.random() * 0.5 + 0.15,
        flicker: Math.random() * Math.PI * 2,
      };
    }

    let particles: Particle[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      resize();
      particles = Array.from({ length: COUNT }, () => makeParticle(true));
    }

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Subtle ambient electric blue radial glow in lower right corner
      const grad = ctx.createRadialGradient(
        width * 0.82,
        height * 0.85,
        0,
        width * 0.82,
        height * 0.85,
        Math.max(width, height) * 0.55
      );
      grad.addColorStop(0, "rgba(76,141,255,0.10)");
      grad.addColorStop(1, "rgba(76,141,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render floating spark particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speed;
        p.x += p.drift;
        p.flicker += 0.05;
        const flick = (Math.sin(p.flicker) + 1) / 2;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},${(p.alpha * (0.5 + flick * 0.5)).toFixed(3)})`;
        ctx.fill();

        if (p.y < -10) {
          particles[i] = makeParticle(false);
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    init();
    window.addEventListener("resize", resize);
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="forge-canvas" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
