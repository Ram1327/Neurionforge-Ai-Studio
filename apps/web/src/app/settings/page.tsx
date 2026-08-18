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
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 pb-24 font-sans">
      {/* Header */}
      <div className="border-b border-[rgba(238,242,248,0.08)] pb-6">
        <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#eef2f8] flex items-center gap-2.5 tracking-tight">
          <Settings className="w-6 h-6 text-[#4c8dff]" />
          System &amp; Hardware Diagnostics
        </h1>
        <p className="text-sm text-[#8a93a3] mt-1">
          Review local CPU threads, RAM allocation, server connectivity, and architectural milestones.
        </p>
      </div>

      {/* Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between text-[#8a93a3] text-xs font-mono font-semibold mb-2">
            <span>CPU THREADS</span>
            <Cpu className="w-4 h-4 text-[#4c8dff]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#eef2f8]">
            {systemStatus ? `${systemStatus.cpu_threads} Cores` : "Detecting..."}
          </div>
          <span className="text-[11px] text-[#8a93a3] font-mono mt-1 block">
            AVX2 / Multi-Threaded
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between text-[#8a93a3] text-xs font-mono font-semibold mb-2">
            <span>SYSTEM RAM</span>
            <Activity className="w-4 h-4 text-[#34d399]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#eef2f8]">
            {systemStatus?.total_ram_gb ? `${systemStatus.total_ram_gb} GB` : "16.0 GB"}
          </div>
          <span className="text-[11px] text-[#34d399] font-mono mt-1 block">
            {systemStatus?.available_ram_gb ? `${systemStatus.available_ram_gb} GB Available` : "Ready"}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between text-[#8a93a3] text-xs font-mono font-semibold mb-2">
            <span>GPU ACCELERATION</span>
            <Zap className="w-4 h-4 text-[#8a93a3]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#8a93a3]">
            CPU-Only
          </div>
          <span className="text-[11px] text-[#8a93a3] font-mono mt-1 block">
            No GPU / Q4_K_M Quantized
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between text-[#8a93a3] text-xs font-mono font-semibold mb-2">
            <span>SERVER STATUS</span>
            <Server className="w-4 h-4 text-[#4c8dff]" />
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isServerOnline ? "bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-lg font-bold font-mono text-[#eef2f8]">
              {isServerOnline ? "Connected" : "Offline"}
            </span>
          </div>
          <span className="text-[11px] text-[#8a93a3] mt-1 block font-mono">
            {isServerOnline ? "Port 8000" : "Run dev:server"}
          </span>
        </div>
      </div>

      {/* Connectivity & Endpoints Card */}
      <div className="p-6 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold uppercase text-base text-[#eef2f8] flex items-center gap-2 tracking-wide">
            <Server className="w-4 h-4 text-[#4c8dff]" />
            Backend Connection Endpoints
          </h3>

          <button
            onClick={testPing}
            disabled={isPinging}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1c2634] hover:bg-[#1c2634]/80 border border-[rgba(238,242,248,0.1)] text-xs font-mono text-[#eef2f8] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-[#4c8dff]" : ""}`} />
            <span>{pingLatency !== null ? `${pingLatency}ms` : "Test Latency"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#07090d]/80 border border-[rgba(238,242,248,0.08)]">
            <span className="text-[#8a93a3] font-semibold block uppercase text-[10px]">
              REST API URL
            </span>
            <code className="text-[#9fe0ff] font-mono mt-1 block bg-transparent p-0">{API_BASE}</code>
          </div>
          <div className="p-3.5 rounded-xl bg-[#07090d]/80 border border-[rgba(238,242,248,0.08)]">
            <span className="text-[#8a93a3] font-semibold block uppercase text-[10px]">
              WebSocket Streaming URL
            </span>
            <code className="text-[#9fe0ff] font-mono mt-1 block bg-transparent p-0">{WS_BASE}/ws/inference</code>
          </div>
        </div>
      </div>

      {/* Project Roadmap Progress */}
      <div className="p-6 rounded-2xl bg-[#10161f]/70 border border-[rgba(238,242,248,0.08)] backdrop-blur-md space-y-4">
        <h3 className="font-display font-bold uppercase text-base text-[#eef2f8] flex items-center gap-2 tracking-wide">
          <ShieldCheck className="w-4 h-4 text-[#4c8dff]" />
          NeurionForge Studio Phased Roadmap
        </h3>

        <div className="divide-y divide-[rgba(238,242,248,0.08)]">
          {roadmap.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-[#4c8dff] font-bold">{item.phase}</span>
                <span className="text-[#eef2f8]/80 font-sans">{item.title}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  item.status === "Completed"
                    ? "bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/30"
                    : item.status === "Active"
                    ? "bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30 animate-pulse"
                    : item.status === "Next"
                    ? "bg-[#7fb4ff]/10 text-[#7fb4ff] border border-[#7fb4ff]/30"
                    : "bg-[#1c2634] text-[#8a93a3]"
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

