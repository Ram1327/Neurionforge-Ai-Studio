"use client";

import React, { useState } from "react";
import {
  Settings,
  Cpu,
  HardDrive,
  Activity,
  Server,
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { API_BASE, WS_BASE, api } from "@/lib/api";

export default function SettingsPage() {
  const { systemStatus, isServerOnline, refresh, activeModel } = useModels();
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const testPing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await api.getHealth();
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
    } catch {
      setPingLatency(null);
    } finally {
      setIsPinging(false);
    }
  };

  const roadmap = [
    { phase: "Phase 0", title: "Foundations & GGUF Verification", status: "Completed" },
    { phase: "Phase 1", title: "Inference Studio (LM Studio v1)", status: "Completed" },
    { phase: "Phase 1.1", title: "HuggingFace Hub In-App Downloader", status: "Active" },
    { phase: "Phase 2", title: "LoRA / QLoRA Fine-Tuning Studio", status: "Next" },
    { phase: "Phase 3", title: "RAG & Desktop Packaging", status: "Upcoming" },
    { phase: "Phase 4", title: "Local Coding Agent Platform", status: "Upcoming" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-cyan-400" />
          System & Hardware Diagnostics
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review local CPU threads, RAM allocation, server connectivity, and architectural milestones.
        </p>
      </div>

      {/* Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>CPU THREADS</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {systemStatus ? `${systemStatus.cpu_threads} Cores` : "Detecting..."}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            AVX2 / Multi-Threaded
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>SYSTEM RAM</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {systemStatus?.total_ram_gb ? `${systemStatus.total_ram_gb} GB` : "16.0 GB"}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {systemStatus?.available_ram_gb ? `${systemStatus.available_ram_gb} GB Available` : "Ready"}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>GPU ACCELERATION</span>
            <Zap className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            CPU-Only
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            No GPU / Q4_K_M Quantized
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>SERVER STATUS</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isServerOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-lg font-bold text-white">
              {isServerOnline ? "Connected" : "Offline"}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-mono">
            {isServerOnline ? "Port 8000" : "Run dev:server"}
          </span>
        </div>
      </div>

      {/* Connectivity & Endpoints Card */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Backend Connection Endpoints
          </h3>

          <button
            onClick={testPing}
            disabled={isPinging}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-cyan-400" : ""}`} />
            <span>{pingLatency !== null ? `${pingLatency}ms` : "Test Latency"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block uppercase text-[10px]">
              REST API URL
            </span>
            <code className="text-cyan-300 font-mono mt-1 block">{API_BASE}</code>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block uppercase text-[10px]">
              WebSocket Streaming URL
            </span>
            <code className="text-cyan-300 font-mono mt-1 block">{WS_BASE}/ws/inference</code>
          </div>
        </div>
      </div>

      {/* Project Roadmap Progress */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          NeurionForge Studio Phased Roadmap
        </h3>

        <div className="divide-y divide-slate-800">
          {roadmap.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-cyan-400 font-bold">{item.phase}</span>
                <span className="text-slate-300">{item.title}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  item.status === "Completed"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : item.status === "Active"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                    : item.status === "Next"
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
