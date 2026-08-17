"use client";

import React from "react";
import Link from "next/link";
import {
  Cpu,
  Terminal,
  Sparkles,
  Layers,
  ShieldCheck,
  HardDrive,
  ArrowRight,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";

export default function HomePage() {
  const { isServerOnline, activeModel } = useModels();

  return (
    <div className="flex-1 flex flex-col justify-between p-6 md:p-12 max-w-6xl mx-auto w-full min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <main className="my-auto py-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Phase 1: Local Inference Studio Active</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Your Own AI Studio & Fine-Tuner, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
            Built From Scratch.
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Run open-weight LLMs locally with high-performance quantized GGUF execution, token-by-token WebSocket streaming, prompt caching, and zero cloud lock-in.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/chat"
            className="flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all hover:scale-105"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Launch Chat Studio</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/models"
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Model Manager</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Local Inference Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Token-by-token WebSocket streaming with GGUF quantization, prompt caching, and sub-400ms TTFT.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Real-Time Telemetry HUD</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Live tokens/sec speed, TTFT latency, token counts, and memory usage surfaced on every prompt.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Global Model Pool</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unified <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">D:/models</code> repository across all local tooling without duplicate storage.
            </p>
          </div>
        </div>

        {/* Live Status Callout */}
        <div className="mt-10 p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-sm">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">
              Active Model: <strong className="text-cyan-400 font-mono">{activeModel?.name || "Qwen2.5-1.5B-Instruct (Q4_K_M)"}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isServerOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>{isServerOnline ? "Local Core Online (:8000)" : "Local Core Offline"}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          © 2026 <span className="text-slate-300 font-medium">NeurionForge</span>. All rights reserved.
        </div>
        <div className="flex items-center space-x-4">
          <a href="https://neurionforge.com" className="hover:text-cyan-400 transition">
            neurionforge.com
          </a>
          <span>•</span>
          <span className="text-slate-400">Local-First Architecture</span>
        </div>
      </footer>
    </div>
  );
}
