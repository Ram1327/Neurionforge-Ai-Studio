"use client";

import React, { useState } from "react";
import { ChatMessage } from "@neurionforge/shared-types";
import { Cpu, AlertTriangle, Layers } from "lucide-react";

interface ContextUsageBarProps {
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
}

export function ContextUsageBar({
  messages,
  systemPrompt = "",
  maxTokens = 4096,
}: ContextUsageBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Estimate tokens (roughly 3.8 characters per token in english/code)
  const textLength =
    systemPrompt.length +
    messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
  const estimatedTokens = Math.ceil(textLength / 3.8);
  const percentage = Math.min(100, Math.round((estimatedTokens / maxTokens) * 100));

  // Color selection
  let barGradient = "from-[#4c8dff] to-[#38bdf8]";
  let textColor = "text-[#9fe0ff]";
  if (percentage >= 85) {
    barGradient = "from-[#f43f5e] to-[#e11d48]";
    textColor = "text-rose-400";
  } else if (percentage >= 65) {
    barGradient = "from-[#fbbf24] to-[#f59e0b]";
    textColor = "text-amber-400";
  }

  return (
    <div
      className="relative w-full bg-[#07090d]/80 border-b border-[rgba(238,242,248,0.06)] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2">
        <span className="text-[#8a93a3] flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-[#4c8dff]" />
          <span className="hidden sm:inline">Context Window:</span>
        </span>
        <span className={`font-semibold ${textColor}`}>
          {estimatedTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10161f] border border-[rgba(238,242,248,0.08)] text-[#8a93a3]">
          {percentage}%
        </span>
        {percentage >= 85 && (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Near Context Limit
          </span>
        )}
      </div>

      {/* Mini Visual Bar */}
      <div className="w-24 sm:w-44 h-1.5 bg-[#1c2634] rounded-full overflow-hidden border border-[rgba(238,242,248,0.06)]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-300`}
          style={{ width: `${Math.max(2, percentage)}%` }}
        />
      </div>

      {/* Floating Detailed Tooltip */}
      {showTooltip && (
        <div className="absolute top-8 left-4 z-30 p-2.5 rounded-xl bg-[#10161f] border border-[rgba(238,242,248,0.12)] shadow-xl text-xs space-y-1 text-[#eef2f8] animate-in fade-in zoom-in-95">
          <div className="font-semibold text-[11px] text-[#9fe0ff] flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5" /> KV Cache &amp; Context Allocation
          </div>
          <div className="text-[11px] text-[#8a93a3] font-mono space-y-0.5">
            <div className="flex justify-between gap-4">
              <span>Messages:</span>
              <span className="text-[#eef2f8]">{messages.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Estimated Context:</span>
              <span className="text-[#eef2f8]">{estimatedTokens} toks</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Maximum Context:</span>
              <span className="text-[#eef2f8]">{maxTokens} toks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
