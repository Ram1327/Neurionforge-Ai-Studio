"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
} from "lucide-react";
import { ChatMessage, InferenceStats } from "@neurionforge/shared-types";
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

export default function ChatPage() {
  const { models, activeModel, loadModel, isServerOnline, loadingModelId } = useModels();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  // Hyperparameters
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT_PRESETS[0].prompt);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history and params from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("neurion_chat_messages");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      const savedPrompt = localStorage.getItem("neurion_system_prompt");
      if (savedPrompt) {
        setSystemPrompt(savedPrompt);
      }
      const savedTemp = localStorage.getItem("neurion_temperature");
      if (savedTemp) {
        setTemperature(parseFloat(savedTemp));
      }
    } catch {
      // ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save chat history to localStorage on change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("neurion_chat_messages", JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages, isHydrated]);

  // Save parameters to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("neurion_system_prompt", systemPrompt);
      localStorage.setItem("neurion_temperature", temperature.toString());
    } catch {
      // ignore storage errors
    }
  }, [systemPrompt, temperature, isHydrated]);

  // Sync selected model with active model
  useEffect(() => {
    if (activeModel && !selectedModelId) {
      setSelectedModelId(activeModel.id);
    } else if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [activeModel, models, selectedModelId]);

  // Hook for streaming completions
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
          stats: stats,
          created_at: new Date().toISOString(),
        },
      ]);
    },
  });

  // Auto-scroll chat on message updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamedContent]);

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

    // Dispatch inference over WebSocket
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
    try {
      localStorage.removeItem("neurion_chat_messages");
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Chat Stream */}
      <div className="flex flex-1 flex-col h-full bg-[#090d16] relative overflow-hidden">
        {/* Top Chat Bar: Model & Parameters HUD */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d121f]/70 px-4 py-2.5 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            {/* Model Selector Pill */}
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <select
                value={selectedModelId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedModelId(newId);
                  if (newId && activeModel?.id !== newId) {
                    loadModel(newId);
                  }
                }}
                disabled={models.length === 0 || isStreaming}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-50"
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
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-1.5 animate-pulse">
                <Cpu className="w-3.5 h-3.5 animate-spin" /> Loading into RAM...
              </span>
            )}
          </div>

          {/* Controls & Telemetry Stats */}
          <div className="flex items-center space-x-2">
            {liveStats && (
              <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-mono text-[11px]">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>{liveStats.tokens_per_sec} tps</span>
                <span className="text-cyan-600">|</span>
                <Clock className="w-3 h-3 text-sky-400" />
                <span>{liveStats.ttft_ms}ms TTFT</span>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showSettings
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Params</span>
            </button>

            <button
              onClick={handleClearChat}
              title="Clear conversation history"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Server Warning if Offline */}
        {!isServerOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                Backend server is currently offline. Run <code>pnpm dev:server</code> or <code>uvicorn main:app</code> on port 8000.
              </span>
            </div>
          </div>
        )}

        {/* Chat History Stream */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
        >
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center my-auto py-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                NeurionForge Inference Studio
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md">
                100% local quantized inference running directly on your CPU with sub-500ms TTFT. Pick a prompt below or type your own.
              </p>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-xs text-slate-300 hover:text-white transition-all text-left group"
                  >
                    <span className="text-cyan-400 font-mono text-[10px] block mb-1">
                      Prompt 0{idx + 1}
                    </span>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex space-x-3.5 max-w-4xl mx-auto ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/10 mt-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col group relative max-w-[85%] sm:max-w-[78%] ${
                      msg.role === "user"
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md shadow-cyan-600/10"
                          : "bg-[#111726] border border-slate-800 text-slate-200 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Assistant Telemetry HUD */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center space-x-3 mt-1.5 px-1 text-[11px] text-slate-500 font-mono">
                        {msg.stats && (
                          <>
                            <span className="flex items-center gap-1 text-cyan-400/90">
                              <Zap className="w-3 h-3" />
                              {msg.stats.tokens_per_sec} tok/s
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              {msg.stats.ttft_ms}ms TTFT
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Hash className="w-3 h-3" />
                              {msg.stats.total_tokens} toks
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Timer className="w-3 h-3" />
                              {msg.stats.total_duration_sec}s
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming Live Response Chunk */}
              {isStreaming && (
                <div className="flex space-x-3.5 max-w-4xl mx-auto justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/10 mt-1 animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col items-start max-w-[85%] sm:max-w-[78%]">
                    <div className="rounded-2xl rounded-bl-none px-4 py-3 text-sm leading-relaxed bg-[#111726] border border-cyan-500/30 text-slate-200 shadow-sm">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamedContent || "Thinking..."}
                        </ReactMarkdown>
                        <span className="animate-cursor" />
                      </div>
                    </div>
                    {liveStats && (
                      <div className="flex items-center space-x-2 mt-1.5 px-1 text-[11px] text-cyan-400 font-mono">
                        <Zap className="w-3 h-3" />
                        <span>{liveStats.tokens_per_sec} tok/s</span>
                        <span>•</span>
                        <span>{liveStats.total_tokens} tokens</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Streaming Error Message */}
              {streamError && (
                <div className="max-w-4xl mx-auto p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{streamError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800/80 bg-[#0d121f] p-3 md:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end rounded-2xl bg-slate-900/90 border border-slate-700/70 shadow-inner focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all p-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, generate code, or test inference..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-36 min-h-[40px]"
              />

              <div className="flex items-center space-x-2 pl-2">
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex h-9 items-center space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-md shadow-cyan-500/20"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-500">
              <div className="flex items-center space-x-2">
                <span>Press <strong className="text-slate-400">Enter</strong> to send, <strong className="text-slate-400">Shift+Enter</strong> for newline</span>
              </div>
              <div className="font-mono">
                {activeModel ? `${activeModel.name} (${activeModel.quantization})` : "No Model Loaded"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer: Inference Parameters */}
      {showSettings && (
        <div className="w-80 border-l border-slate-800/80 bg-[#0d121f] p-5 overflow-y-auto space-y-6 flex flex-col shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Inference Parameters
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* System Prompt Preset Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              System Prompt Persona
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SYSTEM_PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setSystemPrompt(preset.prompt)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border text-left truncate transition-colors ${
                    systemPrompt === preset.prompt
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
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
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Temperature</span>
              <span className="font-mono text-cyan-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800"
            />
            <p className="text-[11px] text-slate-500">
              Higher values increase creativity; lower values make output more deterministic.
            </p>
          </div>

          {/* Top-P */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Top-P (Nucleus)</span>
              <span className="font-mono text-cyan-400">{topP}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800"
            />
            <p className="text-[11px] text-slate-500">
              Limits token pool to cumulative probability mass.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Max Generation Tokens</span>
              <span className="font-mono text-cyan-400">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="64"
              max="2048"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800"
            />
            <p className="text-[11px] text-slate-500">
              Maximum tokens generated in a single response.
            </p>
          </div>

          {/* Model Memory Diagnostics */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 mt-auto">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Runtime Execution
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="text-slate-200">llama.cpp CPU</span>
              </div>
              <div className="flex justify-between">
                <span>Prompt Caching:</span>
                <span className="text-emerald-400">KV Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Quantization:</span>
                <span className="text-cyan-400">{activeModel?.quantization || "Q4_K_M"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
