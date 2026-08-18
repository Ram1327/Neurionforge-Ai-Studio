"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  HardDrive,
  MessageSquare,
  Zap,
  ShieldCheck,
  Brain,
  Sliders,
  Terminal,
  Activity,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";

export default function HomePage() {
  const { isServerOnline, activeModel } = useModels();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackLit, setTrackLit] = useState(false);

  const capabilitiesRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLElement>(null);
  const techStripRef = useRef<HTMLElement>(null);

  // Scroll reveal IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.12 }
    );

    if (capabilitiesRef.current) observer.observe(capabilitiesRef.current);
    if (roadmapRef.current) observer.observe(roadmapRef.current);
    if (techStripRef.current) observer.observe(techStripRef.current);

    return () => observer.disconnect();
  }, []);

  // Roadmap track light up
  useEffect(() => {
    const roadmapEl = roadmapRef.current;
    if (!roadmapEl) return;

    const trackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTrackLit(true);
            trackObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    trackObserver.observe(roadmapEl);
    return () => trackObserver.disconnect();
  }, []);

  return (
    <div className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 lg:px-10 pb-16 font-sans">
      {/* ─── SITE HEADER ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 sm:gap-6 py-6 md:py-8 anim" style={{ "--d": "0s" } as React.CSSProperties}>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="NeurionForge AI Studio">
          <svg
            className="shrink-0 transition-transform group-hover:scale-105"
            width="34"
            height="34"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="#4c8dff" strokeWidth="1.6" />
            <path
              d="M13 27V13L20 17.5V13L27 17.5V27"
              stroke="#eef2f8"
              strokeWidth="1.8"
              strokeLinecap="square"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display font-bold text-xl tracking-tight text-[#eef2f8]">
            NeurionForge
          </span>
          <span className="font-mono text-[11px] tracking-wider text-[#9fe0ff] bg-[#4c8dff]/15 border border-[#4c8dff]/30 px-2.5 py-0.5 rounded-full ml-1">
            AI Studio
          </span>
        </Link>

        {/* Desktop Internal Navigation Pill */}
        <nav
          className="hidden md:flex items-center gap-1.5 bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md rounded-full p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
          aria-label="Studio Navigation"
        >
          <a
            href="#capabilities"
            className="font-mono text-[12.5px] text-[#eef2f8]/70 hover:text-[#eef2f8] hover:bg-[#1c2634]/60 px-3.5 py-1.5 rounded-full transition-all"
          >
            The Toolkit
          </a>
          <a
            href="#roadmap"
            className="font-mono text-[12.5px] text-[#eef2f8]/70 hover:text-[#eef2f8] hover:bg-[#1c2634]/60 px-3.5 py-1.5 rounded-full transition-all"
          >
            Roadmap
          </a>
          <Link
            href="/chat"
            className="font-mono text-[12.5px] text-[#9fe0ff] bg-[#4c8dff]/15 border border-[#4c8dff]/30 px-3.5 py-1.5 rounded-full transition-all hover:bg-[#4c8dff]/25"
          >
            Inference Studio
          </Link>
          <Link
            href="/models"
            className="font-mono text-[12.5px] text-[#eef2f8]/70 hover:text-[#eef2f8] hover:bg-[#1c2634]/60 px-3.5 py-1.5 rounded-full transition-all"
          >
            Model Library
          </Link>
        </nav>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 px-3.5 py-2 rounded-full shrink-0">
          <span className="status-dot" />
          <span>{isServerOnline ? "Local Core Online (:8000)" : "Phase 0: Active"}</span>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className="md:hidden relative w-10 h-10 rounded-full bg-[#1c2634] border border-[rgba(238,242,248,0.1)] flex items-center justify-center cursor-pointer"
        >
          <div className="w-4 h-3.5 flex flex-col justify-between items-center">
            <span
              className={`w-full h-0.5 bg-[#eef2f8] transition-transform duration-200 ${
                mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            />
            <span
              className={`w-full h-0.5 bg-[#eef2f8] transition-opacity duration-200 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-full h-0.5 bg-[#eef2f8] transition-transform duration-200 ${
                mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            />
          </div>
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-4 top-20 z-50 bg-[#10161f] border border-[rgba(238,242,248,0.1)] rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] space-y-2">
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-mono text-sm p-3 rounded-xl text-[#eef2f8] hover:bg-[#1c2634]"
          >
            The Toolkit
          </a>
          <a
            href="#roadmap"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-mono text-sm p-3 rounded-xl text-[#eef2f8] hover:bg-[#1c2634]"
          >
            Roadmap
          </a>
          <Link
            href="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-mono text-sm p-3 rounded-xl text-[#9fe0ff] bg-[#4c8dff]/15 border border-[#4c8dff]/30 font-medium"
          >
            Launch Chat Studio
          </Link>
          <Link
            href="/models"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-mono text-sm p-3 rounded-xl text-[#eef2f8] hover:bg-[#1c2634]"
          >
            Model Library
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-mono text-sm p-3 rounded-xl text-[#eef2f8] hover:bg-[#1c2634]"
          >
            System Diagnostics
          </Link>
          <div className="pt-2 border-t border-[rgba(238,242,248,0.08)] flex items-center gap-2 text-xs font-mono text-[#34d399] px-3">
            <span className="status-dot" />
            <span>{isServerOnline ? "Local Core Online (:8000)" : "Phase 0: Active"}</span>
          </div>
        </div>
      )}

      {/* ─── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="min-h-[75vh] min-h-[75dvh] flex flex-col items-center justify-center text-center py-12 md:py-16">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-[#8a93a3] mb-4 anim uppercase"
          style={{ "--d": ".05s" } as React.CSSProperties}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#4c8dff] shadow-[0_0_10px_#4c8dff]" />
          <span>STATION 01 &mdash; AI STUDIO</span>
        </div>

        {/* Trust pill */}
        <div
          className="inline-flex items-center gap-2 font-mono text-[12.5px] text-[#9fe0ff] bg-[#4c8dff]/10 border border-[#4c8dff]/30 px-4 py-2 rounded-full mb-6 md:mb-8 anim"
          style={{ "--d": ".12s" } as React.CSSProperties}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#4c8dff]" />
          <span>100% Local Inference &amp; Fine-Tuning</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-extrabold leading-[0.98] tracking-[-0.01em] uppercase text-4xl sm:text-6xl lg:text-7xl max-w-[17ch] mx-auto text-[#eef2f8]">
          <span className="block anim" style={{ "--d": ".2s" } as React.CSSProperties}>
            Your Own AI Studio &amp;
          </span>
          <span className="block anim" style={{ "--d": ".3s" } as React.CSSProperties}>
            Fine-Tuner,
          </span>
          <span
            className="block text-[#7fb4ff] drop-shadow-[0_0_35px_rgba(76,141,255,0.5)] anim"
            style={{ "--d": ".4s" } as React.CSSProperties}
          >
            Built From Scratch.
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="mt-6 md:mt-7 max-w-[580px] mx-auto text-[15px] sm:text-[17px] leading-relaxed text-[#eef2f8]/70 anim"
          style={{ "--d": ".52s" } as React.CSSProperties}
        >
          Run open-weight LLMs locally via quantized GGUF execution, train custom LoRA/QLoRA
          adapters on your data, and orchestrate local coding agents &mdash; zero cloud dependencies.
        </p>

        {/* Hero CTA */}
        <div
          className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-3.5 anim"
          style={{ "--d": ".64s" } as React.CSSProperties}
        >
          <Link href="/chat" className="btn-primary">
            <span>Launch Chat Studio</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link href="/models" className="btn-ghost">
            <span>Model Manager</span>
          </Link>
          <a href="#capabilities" className="btn-ghost">
            <span>View the toolkit</span>
          </a>
        </div>

        {/* Scroll Cue */}
        <div
          className="mt-12 md:mt-16 w-5 h-8 rounded-xl border border-[rgba(238,242,248,0.3)] flex justify-center pt-1.5 anim"
          style={{ "--d": ".8s" } as React.CSSProperties}
          aria-hidden="true"
        >
          <span
            className="w-1 h-2 rounded-full bg-[#7fb4ff]"
            style={{ animation: "cueMove 1.8s ease-in-out infinite" }}
          />
        </div>
      </section>

      {/* ─── CAPABILITIES (THE TOOLKIT) ─────────────────────────────────── */}
      <section
        id="capabilities"
        ref={capabilitiesRef}
        className="scroll-reveal py-16 md:py-24 border-t border-[rgba(238,242,248,0.08)]"
      >
        <div className="text-center mb-10 md:mb-14">
          <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl lg:text-5xl text-[#eef2f8] tracking-[-0.01em]">
            The Toolkit
          </h2>
          <p className="mt-2.5 text-[#8a93a3] text-sm sm:text-base max-w-xl mx-auto">
            Everything AI Studio ships with today &mdash; and what&apos;s being built next.
          </p>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-5 flex-wrap font-mono text-xs text-[#8a93a3]">
            <span className="inline-flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
              Live
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-[#4c8dff] shadow-[0_0_6px_#4c8dff]" />
              Building
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-[#8a93a3]" />
              Planned
            </span>
          </div>
        </div>

        {/* 8-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Cpu className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 font-semibold">
                Live
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Local Inference Engine
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Token-by-token WebSocket streaming with GGUF quantization, prompt caching, and sub-200ms time-to-first-token.
            </p>
          </article>

          {/* Card 2 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Layers className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 font-semibold">
                Live
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              PEFT / LoRA Studio
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Dataset ingestion, background fine-tuning pipelines, real-time loss tracking, and GGUF adapter merging.
            </p>
          </article>

          {/* Card 3 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <HardDrive className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 font-semibold">
                Live
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Global Storage Pool
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Unified <code className="text-xs bg-[#4c8dff]/15 text-[#9fe0ff] px-1.5 py-0.5 rounded">D:/models</code> repository shared across all local tooling, so nothing gets duplicated on disk.
            </p>
          </article>

          {/* Card 4 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Zap className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#4c8dff] bg-[#4c8dff]/10 border border-[#4c8dff]/30 font-semibold">
                Building
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              OpenAI-Compatible API
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              A drop-in local endpoint for any OpenAI-SDK app &mdash; same request shape, no API key, no code changes.
            </p>
          </article>

          {/* Card 5 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Brain className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#4c8dff] bg-[#4c8dff]/10 border border-[#4c8dff]/30 font-semibold">
                Building
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Model Library &amp; Quantizer
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Pull, convert, and requantize open-weight checkpoints to GGUF directly from the UI &mdash; no terminal needed.
            </p>
          </article>

          {/* Card 6 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#4c8dff] bg-[#4c8dff]/10 border border-[#4c8dff]/30 font-semibold">
                Building
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Chat Playground
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Multi-session chat with live adapter switching, system-prompt presets, and token-level telemetry.
            </p>
          </article>

          {/* Card 7 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Terminal className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#8a93a3] bg-[#8a93a3]/10 border border-[#8a93a3]/25 font-semibold">
                Planned
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Agent Mode
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              An opencode-style, tool-calling agent with real terminal access &mdash; running entirely against your local models.
            </p>
          </article>

          {/* Card 8 */}
          <article className="rounded-2xl p-5 md:p-6 bg-gradient-to-b from-[#1c2634]/55 to-[#10161f]/55 border border-[rgba(238,242,248,0.08)] backdrop-blur-md hover:border-[#4c8dff]/40 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(76,141,255,0.12)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7fb4ff] bg-[#4c8dff]/10 border border-[#4c8dff]/25">
                <Activity className="w-5 h-5" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#8a93a3] bg-[#8a93a3]/10 border border-[#8a93a3]/25 font-semibold">
                Planned
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-lg text-[#eef2f8] mb-2 tracking-tight">
              Resource Monitor
            </h3>
            <p className="text-sm text-[#eef2f8]/65 leading-relaxed">
              Live VRAM, RAM, and GPU utilization per loaded model, so you know what fits before you load it.
            </p>
          </article>
        </div>
      </section>

      {/* ─── ROADMAP (THE BUILD PATH) ───────────────────────────────────── */}
      <section
        id="roadmap"
        ref={roadmapRef}
        className="scroll-reveal py-16 md:py-24 border-t border-[rgba(238,242,248,0.08)]"
      >
        <div className="text-center mb-10 md:mb-14">
          <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl lg:text-5xl text-[#eef2f8] tracking-[-0.01em]">
            The Build Path
          </h2>
          <p className="mt-2.5 text-[#8a93a3] text-sm sm:text-base max-w-xl mx-auto">
            Three phases, shipping in order &mdash; nothing is deferred past its phase.
          </p>
        </div>

        {/* Progress Track Line */}
        <div className="hidden sm:block relative h-1 rounded-full bg-[#1c2634] mb-8 md:mb-12 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-[#4c8dff] to-[#9fe0ff] transition-all duration-1000 ease-out ${
              trackLit ? "w-[34%] shadow-[0_0_12px_#4c8dff]" : "w-0"
            }`}
          />
        </div>

        {/* 3 Phase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7">
          {/* Phase 0 */}
          <article className="rounded-2xl p-6 bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs tracking-wider text-[#8a93a3] uppercase font-semibold">
                Phase 0
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/30 font-semibold">
                Active
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-2xl text-[#eef2f8] mb-4">
              Foundations
            </h3>
            <ul className="space-y-2.5 text-sm text-[#eef2f8]/70">
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span>Local inference engine</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span>PEFT / LoRA studio</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span>Global storage pool</span>
              </li>
            </ul>
          </article>

          {/* Phase 1 */}
          <article className="rounded-2xl p-6 bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs tracking-wider text-[#8a93a3] uppercase font-semibold">
                Phase 1
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#4c8dff] bg-[#4c8dff]/10 border border-[#4c8dff]/30 font-semibold">
                Building
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-2xl text-[#eef2f8] mb-4">
              Studio Complete
            </h3>
            <ul className="space-y-2.5 text-sm text-[#eef2f8]/70">
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4c8dff]" />
                <span>OpenAI-compatible API server</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4c8dff]" />
                <span>Model library &amp; quantizer</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4c8dff]" />
                <span>Chat playground</span>
              </li>
            </ul>
          </article>

          {/* Phase 2 */}
          <article className="rounded-2xl p-6 bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs tracking-wider text-[#8a93a3] uppercase font-semibold">
                Phase 2
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#8a93a3] bg-[#8a93a3]/10 border border-[#8a93a3]/25 font-semibold">
                Planned
              </span>
            </div>
            <h3 className="font-display font-bold uppercase text-2xl text-[#eef2f8] mb-4">
              Agent Layer
            </h3>
            <ul className="space-y-2.5 text-sm text-[#eef2f8]/70">
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8a93a3]" />
                <span>Tool-calling agent mode</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8a93a3]" />
                <span>Terminal-connected execution</span>
              </li>
              <li className="pt-2.5 border-t border-[rgba(238,242,248,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8a93a3]" />
                <span>Per-model resource monitor</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      {/* ─── TECH STRIP ─────────────────────────────────────────────────── */}
      <section
        ref={techStripRef}
        className="scroll-reveal mt-10 p-5 sm:p-6 bg-[#10161f]/60 border border-[rgba(238,242,248,0.08)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="font-mono text-xs sm:text-sm text-[#eef2f8]/75 flex items-center gap-2.5">
          <span className="text-[#7fb4ff] font-bold">&gt;_</span>
          <span>
            Inference baseline:{" "}
            <span className="text-[#9fe0ff] font-semibold">
              {activeModel?.name || "Qwen2.5-1.5B-Instruct (Q4_K_M)"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isServerOnline
                  ? "bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-[#8a93a3]">
              {isServerOnline ? "Local Core Online (:8000)" : "Local Core Offline"}
            </span>
          </div>
          <span className="hidden sm:inline text-[#8a93a3]/50">|</span>
          <span className="font-mono text-xs text-[#8a93a3]">
            FastAPI Core + Next.js App Router
          </span>
        </div>
      </section>

      {/* ─── SITE FOOTER ─────────────────────────────────────────────────── */}
      <footer className="mt-14 pt-8 border-t border-[rgba(238,242,248,0.08)] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#8a93a3]">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <span className="font-display font-bold text-base text-[#eef2f8] tracking-tight">
            NeurionForge
          </span>
          <span className="text-[12px] text-[#8a93a3]">
            &copy; 2026 NeurionForge. All rights reserved.
          </span>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center font-mono text-[12px]" aria-label="Studio Links">
          <Link href="/chat" className="text-[#eef2f8]/70 hover:text-[#9fe0ff] transition-colors">
            Chat Studio
          </Link>
          <Link href="/models" className="text-[#eef2f8]/70 hover:text-[#9fe0ff] transition-colors">
            Model Manager
          </Link>
          <Link href="/settings" className="text-[#eef2f8]/70 hover:text-[#9fe0ff] transition-colors">
            Diagnostics
          </Link>
          <a href="#capabilities" className="text-[#eef2f8]/70 hover:text-[#9fe0ff] transition-colors">
            Toolkit
          </a>
          <a href="#roadmap" className="text-[#eef2f8]/70 hover:text-[#9fe0ff] transition-colors">
            Roadmap
          </a>
        </nav>

        <div className="font-mono text-[11.5px] text-[#8a93a3] text-center sm:text-right">
          neurionforge.com &nbsp;&middot;&nbsp; Local-First Architecture
        </div>
      </footer>
    </div>
  );
}

