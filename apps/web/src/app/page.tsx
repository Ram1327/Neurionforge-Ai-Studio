import React from "react";
import { Cpu, Terminal, Sparkles, Layers, ShieldCheck, HardDrive, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 md:p-12 max-w-6xl mx-auto w-full">
      {/* Brand Header */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">NeurionForge</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                AI Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">aistudio.neurionforge.com</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Phase 0: Foundations Active</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="my-auto py-12">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>100% Local Inference & Fine-Tuning</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Your Own AI Studio & Fine-Tuner, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
            Built From Scratch.
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Run open-weight LLMs locally via quantized GGUF execution, train custom LoRA/QLoRA adapters on your data, and orchestrate local coding agents with zero cloud dependencies.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Local Inference Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Token-by-token WebSocket streaming with GGUF quantization, prompt caching, and sub-200ms TTFT.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">PEFT / LoRA Studio</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dataset ingestion, background fine-tuning pipelines, real-time loss tracking, and GGUF adapter merging.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Global Storage Pool</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unified <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">D:/models</code> repository across all local tooling without data duplication.
            </p>
          </div>
        </div>

        {/* Status Callout */}
        <div className="mt-10 p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300">
              Inference baseline: <strong className="text-cyan-400 font-mono">Qwen2.5-1.5B-Instruct (Q4_K_M)</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span>FastAPI Core + Next.js App Router</span>
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
