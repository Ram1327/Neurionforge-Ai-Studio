"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Square,
  Sparkles,
  User,
  Sliders,
  RotateCcw,
  Zap,
  Clock,
  Hash,
  Timer,
  Check,
  Copy,
  AlertCircle,
  HardDrive,
  Cpu,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { ChatMessage } from "@neurionforge/shared-types";
import { useModels } from "@/hooks/useModels";
import { useInferenceStream } from "@/hooks/useInferenceStream";

const SYSTEM_PROMPT_PRESETS = [
  {
    name: "Helpful Assistant",
    prompt: "You are NeurionForge AI, an intelligent, concise, and helpful local AI assistant.",
  },
  {
    name: "Senior Systems Engineer",
    prompt: "You are a senior systems engineer. Provide highly technical, clean, and optimized code solutions with concise explanations.",
  },
  {
    name: "Concise Explainer",
    prompt: "Explain concepts with maximum clarity and zero fluff. Use bullet points and bold keywords.",
  },
  {
    name: "Code Refactorer",
    prompt: "Analyze the user's code for performance bottlenecks, edge cases, and type safety. Provide cleaner refactored versions.",
  },
];

const SUGGESTED_PROMPTS = [
  "Explain how GGUF quantization (e.g. Q4_K_M) works on CPU.",
  "Write a Python script for WebSocket streaming with asyncio.",
  "What is the difference between LoRA and QLoRA fine-tuning?",
  "Write a high-performance Next.js 15 route handler with caching.",
];

const SCROLL_BOTTOM_THRESHOLD = 60; // px from bottom = considered "at bottom"

export default function ChatPage() {
  const { models, activeModel, loadModel, isServerOnline, loadingModelId } = useModels();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT_PRESETS[0].prompt);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // UI scroll state (only for rendering buttons, NOT for scroll logic)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The ONLY source of truth for whether we should auto-scroll.
  // This is a ref so it never causes re-renders and is always current.
  const userScrolledUpRef = useRef(false);

  // Load chat history and params from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("neurion_chat_messages");
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      const savedPrompt = localStorage.getItem("neurion_system_prompt");
      if (savedPrompt) setSystemPrompt(savedPrompt);
      const savedTemp = localStorage.getItem("neurion_temperature");
      if (savedTemp) setTemperature(parseFloat(savedTemp));
    } catch {
      // ignore
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("neurion_chat_messages", JSON.stringify(messages));
    } catch {}
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("neurion_system_prompt", systemPrompt);
      localStorage.setItem("neurion_temperature", temperature.toString());
    } catch {}
  }, [systemPrompt, temperature, isHydrated]);

  useEffect(() => {
    if (activeModel && !selectedModelId) {
      setSelectedModelId(activeModel.id);
    } else if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [activeModel, models, selectedModelId]);

  // ─── Scroll helpers ───────────────────────────────────────────────────────

  /** Returns true if the container is scrolled to within threshold of the bottom */
  const checkAtBottom = useCallback((): boolean => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
  }, []);

  /** Instantly scroll to the absolute bottom (no animation, used internally) */
  const snapToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  /** Smooth scroll to bottom (used when the user clicks the button) */
  const smoothScrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // Re-enable auto-scroll as the user has opted back in
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
  }, []);

  const scrollToTop = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * This is the ONLY scroll event handler. It runs on every native scroll.
   * Its only job: update the "user scrolled up" flag and button visibility.
   * It does NOT trigger any auto-scroll — that's done separately below.
   */
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = checkAtBottom();

    // If user scrolled up, lock auto-scroll immediately
    if (!atBottom) {
      userScrolledUpRef.current = true;
    } else {
      // User manually scrolled back down to the bottom — re-enable auto-scroll
      userScrolledUpRef.current = false;
    }

    setShowScrollToBottom(!atBottom);
    setShowScrollToTop(el.scrollTop > 200);
  }, [checkAtBottom]);

  // ─── Auto-scroll logic ────────────────────────────────────────────────────

  // When NEW MESSAGES are added (e.g. user sent, or AI response finished),
  // always scroll to bottom and reset the lock
  useEffect(() => {
    if (messages.length === 0) return;
    userScrolledUpRef.current = false;
    // Use requestAnimationFrame to let the DOM paint first
    requestAnimationFrame(() => {
      snapToBottom();
      setShowScrollToBottom(false);
    });
  }, [messages.length, snapToBottom]); // Only fire when message COUNT changes, not content

  // When STREAMED CONTENT changes (token-by-token during generation),
  // ONLY scroll if the user has NOT scrolled up
  useEffect(() => {
    if (userScrolledUpRef.current) return; // User is reading — do not scroll
    requestAnimationFrame(() => {
      snapToBottom();
    });
  }, [snapToBottom]); // This runs on every render during streaming via the component update

  // ─── Inference stream ─────────────────────────────────────────────────────

  const {
    isStreaming,
    streamedContent,
    liveStats,
    error: streamError,
    sendPrompt,
    stopStreaming,
  } = useInferenceStream({
    onFinish: (fullText, stats) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fullText,
          stats,
          created_at: new Date().toISOString(),
        },
      ]);
    },
  });

  // Trigger the streaming content auto-scroll effect
  useEffect(() => {
    if (!isStreaming) return;
    if (userScrolledUpRef.current) return;
    requestAnimationFrame(() => snapToBottom());
  }, [streamedContent, isStreaming, snapToBottom]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    // Reset scroll lock whenever user sends a new message
    userScrolledUpRef.current = false;

    sendPrompt({
      model_id: selectedModelId || activeModel?.id,
      messages: newHistory,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    if (isStreaming) stopStreaming();
    setMessages([]);
    userScrolledUpRef.current = false;
    try { localStorage.removeItem("neurion_chat_messages"); } catch {}
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-1 flex-col h-full bg-[#07090d] relative overflow-hidden">

        {/* Top HUD Bar */}
        <div className="flex items-center justify-between border-b border-[rgba(238,242,248,0.08)] bg-[#10161f]/80 px-4 py-2.5 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-[#4c8dff]" />
              <select
                value={selectedModelId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedModelId(newId);
                  if (newId && activeModel?.id !== newId) loadModel(newId);
                }}
                disabled={models.length === 0 || isStreaming}
                className="bg-[#10161f] border border-[rgba(238,242,248,0.12)] rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-[#eef2f8] focus:outline-none focus:border-[#4c8dff] cursor-pointer disabled:opacity-50"
              >
                {models.length === 0 ? (
                  <option value="">No models detected in D:/models</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.quantization}) {m.loaded ? "✓ Loaded" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
            {loadingModelId && (
              <span className="text-xs text-[#9fe0ff] font-mono flex items-center gap-1.5 animate-pulse">
                <Cpu className="w-3.5 h-3.5 animate-spin text-[#4c8dff]" /> Loading into RAM...
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {liveStats && (
              <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#4c8dff]/10 border border-[#4c8dff]/30 text-[#9fe0ff] font-mono text-[11px]">
                <Zap className="w-3 h-3 text-[#4c8dff]" />
                <span>{liveStats.tokens_per_sec} tps</span>
                <span className="text-[#4c8dff]/40">|</span>
                <Clock className="w-3 h-3 text-[#7fb4ff]" />
                <span>{liveStats.ttft_ms}ms TTFT</span>
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                showSettings
                  ? "bg-[#4c8dff]/20 text-[#9fe0ff] border-[#4c8dff]/40 shadow-[0_0_10px_rgba(76,141,255,0.2)]"
                  : "bg-[#1c2634]/60 text-[#8a93a3] border-[rgba(238,242,248,0.08)] hover:bg-[#1c2634] hover:text-[#eef2f8]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Params</span>
            </button>
            <button
              onClick={handleClearChat}
              title="Clear conversation history"
              className="p-1.5 rounded-lg text-[#8a93a3] hover:bg-[#1c2634] hover:text-[#eef2f8] border border-[rgba(238,242,248,0.08)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Server Offline Banner */}
        {!isServerOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>
              Backend server is offline. Run <code>pnpm dev:server</code> on port 8000.
            </span>
          </div>
        )}

        {/* Chat Message List */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
          style={{ overscrollBehavior: "contain" }}
        >
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center my-auto py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#4c8dff]/15 border border-[#4c8dff]/30 flex items-center justify-center shadow-[0_0_20px_rgba(76,141,255,0.25)] mb-4">
                <Sparkles className="w-6 h-6 text-[#9fe0ff]" />
              </div>
              <h2 className="font-display font-bold uppercase text-2xl text-[#eef2f8] mb-2 tracking-tight">
                NeurionForge Inference Studio
              </h2>
              <p className="text-sm text-[#8a93a3] mb-8 max-w-md">
                100% local quantized inference running directly on your CPU with sub-500ms TTFT. Pick a prompt below or type your own.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3.5 rounded-xl bg-[#10161f]/80 border border-[rgba(238,242,248,0.08)] hover:border-[#4c8dff]/50 text-xs text-[#8a93a3] hover:text-[#eef2f8] transition-all text-left group"
                  >
                    <span className="text-[#4c8dff] font-mono text-[10px] block mb-1">PROMPT 0{idx + 1}</span>
                    <span className="group-hover:text-[#eef2f8] transition-colors">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex space-x-3.5 max-w-4xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-[#4c8dff]/15 border border-[#4c8dff]/30 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Sparkles className="w-4 h-4 text-[#9fe0ff]" />
                    </div>
                  )}
                  <div className={`flex flex-col group relative max-w-[85%] sm:max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#4c8dff] to-[#2563eb] text-white rounded-br-none shadow-[0_4px_15px_rgba(76,141,255,0.25)]"
                        : "bg-[#10161f] border border-[rgba(238,242,248,0.08)] text-[#eef2f8] rounded-bl-none shadow-sm"
                    }`}>
                      {msg.role === "user" ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none text-[#eef2f8]/90">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {msg.role === "assistant" && (
                      <div className="flex items-center space-x-3 mt-1.5 px-1 text-[11px] text-[#8a93a3] font-mono">
                        {msg.stats && (
                          <>
                            <span className="flex items-center gap-1 text-[#9fe0ff]"><Zap className="w-3 h-3" />{msg.stats.tokens_per_sec} tok/s</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#8a93a3]"><Clock className="w-3 h-3" />{msg.stats.ttft_ms}ms TTFT</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#8a93a3]"><Hash className="w-3 h-3" />{msg.stats.total_tokens} toks</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#8a93a3]"><Timer className="w-3 h-3" />{msg.stats.total_duration_sec}s</span>
                          </>
                        )}
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-[#8a93a3] hover:text-[#eef2f8] flex items-center gap-1"
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-[#1c2634] border border-[rgba(238,242,248,0.1)] flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-[#8a93a3]" />
                    </div>
                  )}
                </div>
              ))}

              {/* Live Streaming Bubble */}
              {isStreaming && (
                <div className="flex space-x-3.5 max-w-4xl mx-auto justify-start">
                  <div className="w-8 h-8 rounded-lg bg-[#4c8dff]/20 border border-[#4c8dff]/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(76,141,255,0.3)] mt-1 animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#9fe0ff]" />
                  </div>
                  <div className="flex flex-col items-start max-w-[85%] sm:max-w-[78%]">
                    <div className="rounded-2xl rounded-bl-none px-4 py-3 text-sm leading-relaxed bg-[#10161f] border border-[#4c8dff]/40 text-[#eef2f8] shadow-sm">
                      <div className="prose prose-invert prose-sm max-w-none text-[#eef2f8]/90">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedContent || "Thinking..."}</ReactMarkdown>
                        <span className="animate-cursor" />
                      </div>
                    </div>
                    {liveStats && (
                      <div className="flex items-center space-x-2 mt-1.5 px-1 text-[11px] text-[#9fe0ff] font-mono">
                        <Zap className="w-3 h-3 text-[#4c8dff]" />
                        <span>{liveStats.tokens_per_sec} tok/s</span>
                        <span>•</span>
                        <span>{liveStats.total_tokens} tokens</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {streamError && (
                <div className="max-w-4xl mx-auto p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{streamError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Scroll Navigation Buttons */}
        <div className="absolute right-5 bottom-[88px] z-20 flex flex-col items-end gap-2 pointer-events-none">
          {showScrollToTop && (
            <button
              onClick={scrollToTop}
              className="pointer-events-auto p-2.5 rounded-full bg-[#1c2634]/90 hover:bg-[#1c2634] border border-[rgba(238,242,248,0.1)] text-[#8a93a3] hover:text-[#eef2f8] shadow-xl backdrop-blur-sm transition-all hover:scale-110"
              title="Scroll to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
          {showScrollToBottom && (
            <button
              onClick={smoothScrollToBottom}
              className={`pointer-events-auto flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full border shadow-xl backdrop-blur-sm transition-all hover:scale-105 ${
                isStreaming
                  ? "bg-[#4c8dff]/20 border-[#4c8dff]/50 text-[#9fe0ff] hover:bg-[#4c8dff]/30 shadow-[0_0_15px_rgba(76,141,255,0.25)]"
                  : "bg-[#1c2634]/90 hover:bg-[#1c2634] border-[rgba(238,242,248,0.1)] text-[#eef2f8]"
              }`}
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 shrink-0" />
              {isStreaming && <span className="text-xs font-mono font-semibold whitespace-nowrap">Jump to latest</span>}
            </button>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-[rgba(238,242,248,0.08)] bg-[#10161f]/90 p-3 md:p-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end rounded-2xl bg-[#07090d]/90 border border-[rgba(238,242,248,0.1)] shadow-inner focus-within:border-[#4c8dff]/70 focus-within:ring-1 focus-within:ring-[#4c8dff]/30 transition-all p-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, generate code, or test inference..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-[#eef2f8] placeholder-[#8a93a3] focus:outline-none max-h-36 min-h-[40px]"
              />
              <div className="flex items-center space-x-2 pl-2">
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex h-9 items-center space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 text-xs font-mono font-semibold text-white transition-all shadow-md shadow-rose-600/20"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-[0_0_15px_rgba(76,141,255,0.3)]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-[#8a93a3] font-mono">
              <span>Press <strong className="text-[#eef2f8]">Enter</strong> to send, <strong className="text-[#eef2f8]">Shift+Enter</strong> for newline</span>
              <span>
                {activeModel ? `${activeModel.name} (${activeModel.quantization})` : "No Model Loaded"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer: Inference Parameters */}
      {showSettings && (
        <div className="w-80 border-l border-[rgba(238,242,248,0.08)] bg-[#10161f] p-5 overflow-y-auto space-y-6 flex flex-col shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(238,242,248,0.08)]">
            <h3 className="font-display font-bold uppercase text-base text-[#eef2f8] flex items-center gap-2 tracking-wide">
              <Sliders className="w-4 h-4 text-[#4c8dff]" />
              Inference Parameters
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-xs font-mono text-[#8a93a3] hover:text-[#eef2f8]">Close</button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-[#eef2f8] uppercase tracking-wide">System Prompt Persona</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SYSTEM_PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setSystemPrompt(preset.prompt)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border text-left truncate transition-colors ${
                    systemPrompt === preset.prompt
                      ? "bg-[#4c8dff]/15 text-[#9fe0ff] border-[#4c8dff]/30"
                      : "bg-[#07090d] border-[rgba(238,242,248,0.08)] text-[#8a93a3] hover:text-[#eef2f8]"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-[#07090d] border border-[rgba(238,242,248,0.08)] p-2 text-xs text-[#eef2f8] focus:outline-none focus:border-[#4c8dff]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-semibold text-[#eef2f8]">Temperature</span>
              <span className="text-[#9fe0ff]">{temperature}</span>
            </div>
            <input type="range" min="0.0" max="1.5" step="0.05" value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#4c8dff] bg-[#1c2634]" />
            <p className="text-[11px] text-[#8a93a3]">Higher values increase creativity; lower values make output more deterministic.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-semibold text-[#eef2f8]">Top-P (Nucleus)</span>
              <span className="text-[#9fe0ff]">{topP}</span>
            </div>
            <input type="range" min="0.1" max="1.0" step="0.05" value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-[#4c8dff] bg-[#1c2634]" />
            <p className="text-[11px] text-[#8a93a3]">Limits token pool to cumulative probability mass.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-semibold text-[#eef2f8]">Max Generation Tokens</span>
              <span className="text-[#9fe0ff]">{maxTokens}</span>
            </div>
            <input type="range" min="64" max="2048" step="64" value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-[#4c8dff] bg-[#1c2634]" />
            <p className="text-[11px] text-[#8a93a3]">Maximum tokens generated in a single response.</p>
          </div>

          <div className="p-3 rounded-xl bg-[#07090d] border border-[rgba(238,242,248,0.08)] space-y-2 mt-auto">
            <div className="text-xs font-mono font-semibold text-[#eef2f8] flex items-center gap-1.5 uppercase">
              <Cpu className="w-3.5 h-3.5 text-[#4c8dff]" />
              Runtime Execution
            </div>
            <div className="text-[11px] text-[#8a93a3] space-y-1 font-mono">
              <div className="flex justify-between"><span>Engine:</span><span className="text-[#eef2f8]">llama.cpp CPU</span></div>
              <div className="flex justify-between"><span>Prompt Caching:</span><span className="text-[#34d399]">KV Enabled</span></div>
              <div className="flex justify-between"><span>Quantization:</span><span className="text-[#9fe0ff]">{activeModel?.quantization || "Q4_K_M"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

