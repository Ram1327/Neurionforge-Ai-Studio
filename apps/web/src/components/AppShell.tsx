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
  Server,
  ChevronRight,
  HardDrive,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isServerOnline, activeModel, systemStatus } = useModels();

  const navItems = [
    {
      name: "Inference Studio",
      href: "/chat",
      icon: MessageSquare,
      description: "Local chat with streaming telemetry",
    },
    {
      name: "Model Manager",
      href: "/models",
      icon: Layers,
      description: "Local GGUF weights & memory",
    },
    {
      name: "System & Hardware",
      href: "/settings",
      icon: Settings,
      description: "CPU & RAM diagnostics",
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-slate-800/80 bg-[#0d121f] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <Link
              href="/chat"
              className="flex items-center space-x-3 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-base tracking-tight text-white">NeurionForge</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-medium text-cyan-400">AI Studio</span>
                  <span className="text-[10px] text-slate-500 font-mono">v0.1</span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspaces
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/chat" && pathname === "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 font-normal truncate">
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Hardware / Server Status Card */}
        <div className="p-3 border-t border-slate-800/60 space-y-2 bg-[#090d16]/50">
          {/* Active Model Widget */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Active Model
              </span>
              <Link
                href="/models"
                className="text-[10px] text-cyan-400 hover:underline font-mono"
              >
                Manage
              </Link>
            </div>
            {activeModel ? (
              <div>
                <p className="text-xs font-semibold text-white truncate" title={activeModel.name}>
                  {activeModel.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                    {activeModel.quantization}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeModel.size_gb} GB
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-amber-400/90 font-medium">
                No model loaded in RAM
              </div>
            )}
          </div>

          {/* Server Connection Status */}
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex items-center space-x-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isServerOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-[11px] text-slate-400">
                {isServerOnline ? "Local Core Active" : "Server Offline"}
              </span>
            </div>
            {systemStatus && (
              <span className="text-[11px] font-mono text-slate-500">
                {systemStatus.cpu_threads} Threads
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#0d121f]/90 backdrop-blur px-4 md:px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold text-slate-200">
              {pathname === "/models"
                ? "Model Weight Management"
                : pathname === "/settings"
                ? "System Hardware Diagnostics"
                : "Inference Studio"}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {systemStatus?.available_ram_gb !== undefined && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 font-mono">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{systemStatus.available_ram_gb} GB RAM Free</span>
              </div>
            )}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
              <span>Phase 1: LM Studio Active</span>
            </div>
          </div>
        </header>

        {/* Body View */}
        <main className="flex-1 overflow-y-auto bg-[#090d16]">
          {children}
        </main>
      </div>
    </div>
  );
}
