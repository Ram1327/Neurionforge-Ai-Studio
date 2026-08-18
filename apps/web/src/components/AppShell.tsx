"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Layers,
  Settings,
  Cpu,
  Sparkles,
  ChevronRight,
  HardDrive,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { InteractiveBackground } from "@/components/InteractiveBackground";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isServerOnline, activeModel, systemStatus } = useModels();

  // If on the root landing page, render the full-width landing page experience
  if (pathname === "/") {
    return (
      <div className="relative min-h-screen bg-[#07090d] text-[#eef2f8] overflow-x-hidden selection:bg-[#4c8dff]/30 selection:text-[#9fe0ff]">
        <InteractiveBackground />
        {children}
      </div>
    );
  }

  const navItems = [
    {
      name: "Inference Studio",
      href: "/chat",
      icon: MessageSquare,
      description: "Local chat & streaming telemetry",
    },
    {
      name: "Model Manager",
      href: "/models",
      icon: Layers,
      description: "Local GGUF weights & HF Hub",
    },
    {
      name: "System & Hardware",
      href: "/settings",
      icon: Settings,
      description: "CPU & RAM diagnostics",
    },
  ];

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#07090d] text-[#eef2f8]">
      <InteractiveBackground />

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#07090d]/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-[rgba(238,242,248,0.08)] bg-[#10161f]/95 backdrop-blur-md transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[rgba(238,242,248,0.08)]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-3 group"
              onClick={() => setMobileOpen(false)}
            >
              <svg
                className="shrink-0 transition-transform group-hover:scale-105"
                width="32"
                height="32"
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
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-bold text-lg tracking-tight text-[#eef2f8]">
                    NeurionForge
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-[10px] tracking-wider text-[#9fe0ff] bg-[#4c8dff]/15 border border-[#4c8dff]/30 px-2 py-0.5 rounded-full">
                    AI Studio
                  </span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1 text-[#8a93a3] hover:bg-[#1c2634] md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8a93a3]">
            Workspaces
          </div>

          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#8a93a3] hover:bg-[#1c2634]/60 hover:text-[#eef2f8] transition-all"
          >
            <Compass className="h-4 w-4 shrink-0 text-[#8a93a3]" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-sans font-medium">Overview &amp; Toolkit</div>
              <div className="text-[11px] text-[#8a93a3] font-normal truncate">
                Landing &amp; capabilities
              </div>
            </div>
          </Link>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 border ${
                  isActive
                    ? "bg-[#4c8dff]/15 text-[#9fe0ff] border-[#4c8dff]/30 shadow-[0_0_15px_rgba(76,141,255,0.12)]"
                    : "text-[#8a93a3] border-transparent hover:bg-[#1c2634]/60 hover:text-[#eef2f8]"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#9fe0ff]" : "text-[#8a93a3]"}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-sans font-medium">{item.name}</div>
                  <div className="text-[11px] text-[#8a93a3] font-normal truncate">
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9fe0ff]" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Hardware / Server Status Card */}
        <div className="p-3 border-t border-[rgba(238,242,248,0.08)] space-y-2 bg-[#07090d]/50">
          {/* Active Model Widget */}
          <div className="rounded-xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/80 p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8a93a3] font-medium flex items-center gap-1.5 font-mono text-[11px]">
                <HardDrive className="w-3.5 h-3.5 text-[#4c8dff]" />
                ACTIVE MODEL
              </span>
              <Link
                href="/models"
                className="text-[10px] text-[#4c8dff] hover:text-[#9fe0ff] hover:underline font-mono"
              >
                Manage
              </Link>
            </div>
            {activeModel ? (
              <div>
                <p className="text-xs font-semibold text-[#eef2f8] truncate" title={activeModel.name}>
                  {activeModel.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30">
                    {activeModel.quantization}
                  </span>
                  <span className="text-[10px] text-[#8a93a3] font-mono">
                    {activeModel.size_gb} GB
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-amber-400/90 font-mono">
                No model loaded in RAM
              </div>
            )}
          </div>

          {/* Server Connection Status */}
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex items-center space-x-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isServerOnline ? "bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-[11px] text-[#8a93a3] font-mono">
                {isServerOnline ? "Local Core Active" : "Server Offline"}
              </span>
            </div>
            {systemStatus && (
              <span className="text-[11px] font-mono text-[#8a93a3]">
                {systemStatus.cpu_threads} Threads
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-[rgba(238,242,248,0.08)] bg-[#10161f]/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-[#8a93a3] hover:bg-[#1c2634] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="font-display font-bold text-base tracking-wider text-[#eef2f8] uppercase">
              {pathname === "/models"
                ? "Model Weight Management"
                : pathname === "/settings"
                ? "System Hardware Diagnostics"
                : "Inference Studio"}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {systemStatus?.available_ram_gb !== undefined && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#1c2634]/60 border border-[rgba(238,242,248,0.08)] text-[#eef2f8] font-mono">
                <Cpu className="w-3.5 h-3.5 text-[#4c8dff]" />
                <span>{systemStatus.available_ram_gb} GB RAM Free</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#4c8dff]/10 border border-[#4c8dff]/30 text-[#9fe0ff] text-xs font-mono">
              <span className="status-dot" />
              <span>Phase 0: Active</span>
            </div>
          </div>
        </header>

        {/* Body View */}
        <main className="flex-1 overflow-y-auto bg-[#07090d]/60">
          {children}
        </main>
      </div>
    </div>
  );
}

