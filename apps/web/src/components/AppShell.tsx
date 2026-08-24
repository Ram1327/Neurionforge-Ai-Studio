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
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Calendar,
  Wand2,
} from "lucide-react";

import { useModels } from "@/hooks/useModels";
import { useChat } from "@/context/ChatContext";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { AiStudioLogo } from "@/components/AiStudioLogo";


interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isServerOnline, activeModel, systemStatus } = useModels();
  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    sidebarOpen,
    toggleSidebar,
  } = useChat();

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
      icon: HardDrive,
      description: "Local GGUF weights & HF Hub",
    },
    {
      name: "Fine-Tune Studio",
      href: "/finetune",
      icon: Wand2,
      description: "LoRA / QLoRA training engine",
    },
    {
      name: "LoRA Adapters",
      href: "/adapters",
      icon: Layers,
      description: "Trained adapter library & tester",
    },
    {
      name: "System & Hardware",
      href: "/settings",
      icon: Settings,
      description: "CPU & RAM diagnostics",
    },
  ];


  const handleCreateNewChat = () => {
    createSession();
    if (mobileOpen) setMobileOpen(false);
  };

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

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-[rgba(238,242,248,0.08)] bg-[#10161f]/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72" : "w-0 md:border-r-0 overflow-hidden"
        } ${mobileOpen ? "translate-x-0 !w-72" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[rgba(238,242,248,0.08)] shrink-0">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-3 group min-w-0"
              onClick={() => setMobileOpen(false)}
            >
              <AiStudioLogo
                width={34}
                height={26}
                className="shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="truncate">

                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-bold text-base tracking-tight text-[#eef2f8]">
                    NeurionForge
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-[10px] tracking-wider text-[#9fe0ff] bg-[#4c8dff]/15 border border-[#4c8dff]/30 px-1.5 py-0.2 rounded-full">
                    AI Studio
                  </span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => {
                setMobileOpen(false);
                if (window.innerWidth >= 768) toggleSidebar();
              }}
              className="rounded-lg p-1.5 text-[#8a93a3] hover:bg-[#1c2634] hover:text-[#eef2f8] transition shrink-0"
              title="Collapse Sidebar"
            >
              <X className="h-4 w-4 md:hidden" />
              <PanelLeftClose className="h-4 w-4 hidden md:block" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation & Chat History */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Workspaces Section */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8a93a3]">
              Workspaces
            </div>

            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#8a93a3] hover:bg-[#1c2634]/60 hover:text-[#eef2f8] transition-all"
            >
              <Compass className="h-3.5 w-3.5 shrink-0 text-[#8a93a3]" />
              <span className="truncate">Home</span>
            </Link>

            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 border ${
                    isActive
                      ? "bg-[#4c8dff]/15 text-[#9fe0ff] border-[#4c8dff]/30 shadow-[0_0_12px_rgba(76,141,255,0.1)]"
                      : "text-[#8a93a3] border-transparent hover:bg-[#1c2634]/60 hover:text-[#eef2f8]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#9fe0ff]" : "text-[#8a93a3]"}`} />
                  <span className="truncate flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-[#9fe0ff]" />}
                </Link>
              );
            })}
          </div>

          {/* Chat Sessions History Section */}
          <div className="space-y-1.5 pt-2 border-t border-[rgba(238,242,248,0.08)]">
            <div className="flex items-center justify-between px-2.5 py-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8a93a3]">
                Conversations
              </span>
              <button
                onClick={handleCreateNewChat}
                className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#4c8dff]/10 hover:bg-[#4c8dff]/20 text-[#9fe0ff] border border-[#4c8dff]/30 transition"
                title="New Chat Session"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-1 max-h-[42vh] overflow-y-auto pr-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId && pathname === "/chat";
                return (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all border ${
                      isActive
                        ? "bg-[#1c2634] text-[#eef2f8] border-[#4c8dff]/40 shadow-sm"
                        : "text-[#8a93a3] border-transparent hover:bg-[#1c2634]/50 hover:text-[#eef2f8]"
                    }`}
                  >
                    <Link
                      href="/chat"
                      onClick={() => {
                        switchSession(session.id);
                        setMobileOpen(false);
                      }}
                      className="flex-1 min-w-0 pr-1 flex items-center space-x-2"
                      title={session.title}
                    >
                      <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? "text-[#4c8dff]" : "text-[#8a93a3]"}`} />
                      <span className="truncate font-sans">{session.title}</span>
                    </Link>

                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#8a93a3] hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[rgba(238,242,248,0.08)] bg-[#07090d]/50 shrink-0 text-[11px] font-mono text-[#8a93a3] flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isServerOnline ? "bg-[#34d399] shadow-[0_0_6px_#34d399]" : "bg-rose-500"
              }`}
            />
            <span>{isServerOnline ? "Local Core Active" : "Server Offline"}</span>
          </div>
          {systemStatus && <span>{systemStatus.cpu_threads}T</span>}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10 min-w-0">
        {/* Top Navbar HUD (Shifted Elements) */}
        <header className="flex h-14 items-center justify-between border-b border-[rgba(238,242,248,0.08)] bg-[#10161f]/80 backdrop-blur-md px-3 md:px-5 shrink-0 gap-3">
          {/* Left Side: Sidebar Toggle & Page Title */}
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-[#8a93a3] hover:bg-[#1c2634] md:hidden shrink-0"
              title="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex items-center justify-center p-1.5 rounded-lg border border-[rgba(238,242,248,0.08)] bg-[#1c2634]/60 hover:bg-[#1c2634] text-[#8a93a3] hover:text-[#eef2f8] transition shrink-0"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 text-[#4c8dff]" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 text-[#4c8dff]" />
              )}
            </button>

            <div className="font-display font-bold text-sm md:text-base tracking-wider text-[#eef2f8] uppercase truncate">
              {pathname === "/models"
                ? "Model Weight Management"
                : pathname === "/settings"
                ? "System Hardware Diagnostics"
                : pathname === "/finetune"
                ? "Fine-Tuning Studio"
                : pathname === "/adapters"
                ? "LoRA Adapter Library"
                : "Inference Studio"}
            </div>
          </div>

          {/* Right Side: Shifted Telemetry & Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-mono shrink-0">
            {/* Active Model Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#1c2634]/60 border border-[rgba(238,242,248,0.08)] text-[#eef2f8]">
              <HardDrive className="w-3.5 h-3.5 text-[#4c8dff]" />
              {activeModel ? (
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-[#eef2f8] truncate max-w-[130px]" title={activeModel.name}>
                    {activeModel.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30">
                    {activeModel.quantization}
                  </span>
                </div>
              ) : (
                <span className="text-[#8a93a3] text-[11px]">No Model in RAM</span>
              )}
              <Link
                href="/models"
                className="text-[10px] text-[#4c8dff] hover:text-[#9fe0ff] hover:underline pl-1"
              >
                Manage
              </Link>
            </div>

            {/* RAM Status Chip */}
            {systemStatus?.available_ram_gb !== undefined && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#1c2634]/60 border border-[rgba(238,242,248,0.08)] text-[#eef2f8]">
                <Cpu className="w-3.5 h-3.5 text-[#4c8dff]" />
                <span>{systemStatus.available_ram_gb} GB Free</span>
              </div>
            )}

            {/* Server Online Dot */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#1c2634]/60 border border-[rgba(238,242,248,0.08)]">
              <span
                className={`h-2 w-2 rounded-full ${
                  isServerOnline ? "bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="hidden sm:inline text-[11px] text-[#8a93a3]">
                {isServerOnline ? "Local Core" : "Offline"}
              </span>
            </div>

            {/* Phase Pill */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#4c8dff]/10 border border-[#4c8dff]/30 text-[#9fe0ff] text-[11px]">
              <span className="status-dot" />
              <span>Phase 2.0</span>
            </div>
          </div>
        </header>

        {/* Body View */}
        <main className="flex-1 overflow-y-auto bg-[#07090d]/60 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
