"use client";

import React, { useState } from "react";
import {
  Layers,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Power,
  FolderOpen,
  DownloadCloud,
  Search,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  Tag,
  Sparkles,
  ExternalLink,
  Trash2,
  X,
  Star,
  ArrowLeft,
  Cpu,
  Code2,
  Brain,
  MessageSquare,
  Lightbulb,
  Zap,
  FileCode2,
  Wand2,
  ArrowRight,
  ChevronRight,
  Package,
  Box,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useHubSearch } from "@/hooks/useHubSearch";
import { useDownloads } from "@/hooks/useDownloads";
import { usePytorchHubSearch } from "@/hooks/usePytorchHubSearch";
import { DownloadProgressCard } from "@/components/DownloadProgressCard";
import { useConvert } from "@/hooks/useConvert";
import type { ModelInfo, AdapterInfo } from "@neurionforge/shared-types";


// ─── Model Family Catalog ──────────────────────────────────────────────────

type ModelFamilyId =
  | "qwen25"
  | "qwen25coder"
  | "llama32"
  | "deepseek_r1"
  | "mistral"
  | "gemma2"
  | "phi35"
  | "deepseek_v2"
  | "llama31"
  | "qwen25vl"
  | "stablelm"
  | "openchat"
  | "neural_chat"
  | "zephyr"
  | "hermes3"
  | "smollm"
  | "tinyllama"
  | "falcon"
  | "internlm"
  | "yi";

interface ModelFamily {
  id: ModelFamilyId;
  name: string;
  subtitle: string;
  query: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
  border: string;
  tags: string[];
  badge?: string;
}

const MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "qwen25",
    name: "Qwen 2.5",
    subtitle: "Alibaba · 0.5B – 72B",
    query: "Qwen2.5-Instruct-GGUF",
    icon: <Brain className="w-5 h-5" />,
    accent: "text-cyan-300",
    bg: "bg-cyan-950/40",
    border: "border-cyan-800/50 hover:border-cyan-500/60",
    tags: ["General", "Multilingual", "128K ctx"],
    badge: "⭐ #1 Ranked",
  },
  {
    id: "qwen25coder",
    name: "Qwen 2.5 Coder",
    subtitle: "Alibaba · 1.5B – 32B",
    query: "Qwen2.5-Coder-Instruct-GGUF",
    icon: <Code2 className="w-5 h-5" />,
    accent: "text-blue-300",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50 hover:border-blue-500/60",
    tags: ["Coding", "Debugging", "Refactoring"],
    badge: "🔥 Top Coding",
  },
  {
    id: "deepseek_r1",
    name: "DeepSeek R1 Distill",
    subtitle: "DeepSeek · 1.5B – 70B",
    query: "DeepSeek-R1-Distill-GGUF",
    icon: <Lightbulb className="w-5 h-5" />,
    accent: "text-amber-300",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50 hover:border-amber-500/60",
    tags: ["Chain-of-Thought", "Math", "Reasoning"],
    badge: "🧠 Reasoning",
  },
  {
    id: "llama32",
    name: "Llama 3.2",
    subtitle: "Meta · 1B – 90B",
    query: "Llama-3.2-Instruct-GGUF",
    icon: <MessageSquare className="w-5 h-5" />,
    accent: "text-violet-300",
    bg: "bg-violet-950/40",
    border: "border-violet-800/50 hover:border-violet-500/60",
    tags: ["Chat", "Tool Calling", "Agents"],
    badge: "🦙 Meta",
  },
  {
    id: "llama31",
    name: "Llama 3.1",
    subtitle: "Meta · 8B – 405B",
    query: "Llama-3.1-Instruct-GGUF",
    icon: <MessageSquare className="w-5 h-5" />,
    accent: "text-purple-300",
    bg: "bg-purple-950/40",
    border: "border-purple-800/50 hover:border-purple-500/60",
    tags: ["Instruction", "128K ctx", "Open"],
    badge: "Meta",
  },
  {
    id: "gemma2",
    name: "Gemma 2",
    subtitle: "Google · 2B – 27B",
    query: "gemma-2-it-GGUF",
    icon: <Sparkles className="w-5 h-5" />,
    accent: "text-emerald-300",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/50 hover:border-emerald-500/60",
    tags: ["Knowledge Dense", "Safety", "Efficient"],
    badge: "Google",
  },
  {
    id: "phi35",
    name: "Phi-3.5 Mini",
    subtitle: "Microsoft · 3.8B",
    query: "Phi-3.5-mini-instruct-GGUF",
    icon: <Zap className="w-5 h-5" />,
    accent: "text-sky-300",
    bg: "bg-sky-950/40",
    border: "border-sky-800/50 hover:border-sky-500/60",
    tags: ["Textbook Data", "Math", "Compact"],
    badge: "Microsoft",
  },
  {
    id: "mistral",
    name: "Mistral 7B",
    subtitle: "Mistral AI · 7B – 22B",
    query: "Mistral-Instruct-GGUF",
    icon: <Brain className="w-5 h-5" />,
    accent: "text-rose-300",
    bg: "bg-rose-950/40",
    border: "border-rose-800/50 hover:border-rose-500/60",
    tags: ["Dense", "Fast", "SWA Attention"],
    badge: "Mistral AI",
  },
  {
    id: "deepseek_v2",
    name: "DeepSeek V2",
    subtitle: "DeepSeek · MoE 236B",
    query: "DeepSeek-V2-GGUF",
    icon: <Brain className="w-5 h-5" />,
    accent: "text-orange-300",
    bg: "bg-orange-950/40",
    border: "border-orange-800/50 hover:border-orange-500/60",
    tags: ["MoE", "128K ctx", "Efficient"],
    badge: "MoE Giant",
  },
  {
    id: "qwen25vl",
    name: "Qwen 2.5 VL",
    subtitle: "Alibaba · Multimodal",
    query: "Qwen2.5-VL-Instruct-GGUF",
    icon: <Sparkles className="w-5 h-5" />,
    accent: "text-teal-300",
    bg: "bg-teal-950/40",
    border: "border-teal-800/50 hover:border-teal-500/60",
    tags: ["Vision", "Multimodal", "Images"],
    badge: "👁️ Vision",
  },
  {
    id: "hermes3",
    name: "Hermes 3",
    subtitle: "NousResearch · 8B – 70B",
    query: "Hermes-3-GGUF",
    icon: <Code2 className="w-5 h-5" />,
    accent: "text-indigo-300",
    bg: "bg-indigo-950/40",
    border: "border-indigo-800/50 hover:border-indigo-500/60",
    tags: ["Function Calling", "Agents", "Reasoning"],
    badge: "Community",
  },
  {
    id: "smollm",
    name: "SmolLM 2",
    subtitle: "HuggingFace · 135M – 1.7B",
    query: "SmolLM2-Instruct-GGUF",
    icon: <Zap className="w-5 h-5" />,
    accent: "text-yellow-300",
    bg: "bg-yellow-950/40",
    border: "border-yellow-800/50 hover:border-yellow-500/60",
    tags: ["Tiny", "On-device", "Edge AI"],
    badge: "🪶 Ultra-Tiny",
  },
  {
    id: "tinyllama",
    name: "TinyLlama",
    subtitle: "StatNLP · 1.1B",
    query: "TinyLlama-GGUF",
    icon: <Cpu className="w-5 h-5" />,
    accent: "text-slate-300",
    bg: "bg-slate-800/40",
    border: "border-slate-700/50 hover:border-slate-500/60",
    tags: ["1.1B Params", "Fast", "Experimental"],
    badge: "Tiny",
  },
  {
    id: "internlm",
    name: "InternLM 2.5",
    subtitle: "Shanghai AI Lab · 7B – 20B",
    query: "InternLM2_5-Instruct-GGUF",
    icon: <Brain className="w-5 h-5" />,
    accent: "text-lime-300",
    bg: "bg-lime-950/40",
    border: "border-lime-800/50 hover:border-lime-500/60",
    tags: ["200K ctx", "Reasoning", "Math"],
    badge: "Long ctx",
  },
  {
    id: "yi",
    name: "Yi 1.5",
    subtitle: "01-AI · 6B – 34B",
    query: "Yi-1.5-Instruct-GGUF",
    icon: <MessageSquare className="w-5 h-5" />,
    accent: "text-fuchsia-300",
    bg: "bg-fuchsia-950/40",
    border: "border-fuchsia-800/50 hover:border-fuchsia-500/60",
    tags: ["Bilingual", "16K ctx", "Chat"],
    badge: "01-AI",
  },
];

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<"local" | "hub">("local");
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<ModelFamily | null>(null);
  // Phase 3: per-card convert panel state
  const [convertPanelModelId, setConvertPanelModelId] = useState<string | null>(null);
  const [convertQuantization, setConvertQuantization] = useState<"Q4_K_M" | "Q8_0" | "F16">("Q4_K_M");
  const [convertAdapterId, setConvertAdapterId] = useState<string>("");
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);

  const {
    models,
    activeModel,
    isServerOnline,
    isLoading: isModelsLoading,
    isScanning,
    loadingModelId,
    deletingModelId,
    error: modelsError,
    clearError,
    loadModel,
    unloadModel,
    deleteModel,
    rescan,
  } = useModels();

  const {
    query,
    results,
    isSearching,
    error: hubError,
    filesByRepo,
    loadingRepoId,
    expandedRepoId,
    setQuery,
    fetchRepoFiles,
  } = useHubSearch();

  const { jobs, startDownload, startPytorchDownload, cancelDownload, dismissJob } = useDownloads(() => {
    rescan();
    showToast("Model downloaded and ready in Local Library!");
  });

  const {
    isConverting,
    progress: convertProgress,
    step: convertStep,
    error: convertError,
    startConversion,
    reset: resetConvert,
  } = useConvert(() => {
    rescan();
    showToast("GGUF conversion complete! New model available in Local Library.");
    setConvertPanelModelId(null);
    resetConvert();
  });

  const {
    query: ptQuery,
    results: ptResults,
    isSearching: ptIsSearching,
    error: ptError,
    repoInfoByRepo,
    loadingRepoId: ptLoadingRepoId,
    expandedRepoId: ptExpandedRepoId,
    setQuery: setPtQuery,
    fetchRepoInfo,
    invalidateRepo,
  } = usePytorchHubSearch();

  // Separate hub format mode: "gguf" | "pytorch"
  const [hubMode, setHubMode] = useState<"gguf" | "pytorch">("gguf");

  // Load adapters once for the convert panel adapter selector
  React.useEffect(() => {
    fetch("http://127.0.0.1:8000/adapters")
      .then((r) => r.json())
      .then(setAdapters)
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRescan = async () => {
    const res = await rescan();
    if (res.success) {
      showToast(`Scan complete: Found ${res.count} model(s) in D:/models`);
    } else {
      showToast(res.error || "Failed to scan models directory");
    }
  };

  const handleToggleLoad = async (modelId: string, isCurrentlyLoaded: boolean) => {
    if (isCurrentlyLoaded) {
      const ok = await unloadModel(modelId);
      if (ok) showToast("Model unloaded from memory.");
    } else {
      const ok = await loadModel(modelId);
      if (ok) showToast("Model loaded into RAM.");
    }
  };

  const handleDeleteModel = async (modelId: string, name: string) => {
    if (confirm(`Delete '${name}' from disk (D:/models)?`)) {
      const ok = await deleteModel(modelId);
      if (ok) showToast(`Deleted ${name} from D:/models.`);
    }
  };

  const handleStartDownload = async (repoId: string, filename: string, rfilename?: string) => {
    const jobId = await startDownload(repoId, filename, rfilename);
    if (jobId) showToast(`Started downloading ${filename}...`);
  };

  const handlePytorchDownload = async (repoId: string) => {
    const jobId = await startPytorchDownload(repoId);
    if (jobId) {
      showToast(`Started downloading ${repoId.split("/").pop()}... Watch progress below.`);
      // Invalidate cache so "already_downloaded" refreshes after job completes
      invalidateRepo(repoId);
    }
  };

  const handleFamilySelect = (family: ModelFamily) => {
    setSelectedFamily(family);
    setQuery(family.query);
  };

  const handleBackToFamilies = () => {
    setSelectedFamily(null);
    setQuery("");
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderRepoList = () => (
    <div className="space-y-4">
      {results.length === 0 && !isSearching && (
        <div className="py-12 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-500 text-sm">
          No GGUF repositories found. Try a different search term.
        </div>
      )}
      {isSearching && (
        <div className="py-12 flex items-center justify-center gap-3 text-xs text-cyan-400 font-mono">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Searching HuggingFace Hub...</span>
        </div>
      )}
      {!isSearching && results.map((repo) => {
        const isExpanded = expandedRepoId === repo.repo_id;
        const files = filesByRepo[repo.repo_id];
        const isFilesLoading = loadingRepoId === repo.repo_id;

        return (
          <div
            key={repo.repo_id}
            className={`rounded-2xl border transition-all ${
              isExpanded
                ? "bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5"
                : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-white tracking-tight">{repo.model_name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">GGUF</span>
                  {repo.featured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      <Star className="w-3 h-3 fill-amber-300" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{repo.repo_id}</p>
                <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    {repo.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    {repo.likes.toLocaleString()}
                  </span>
                  {repo.pipeline_tag && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Tag className="w-3.5 h-3.5" />{repo.pipeline_tag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <a href={`https://huggingface.co/${repo.repo_id}`} target="_blank" rel="noreferrer"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition" title="View on HuggingFace">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => fetchRepoFiles(repo.repo_id)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    isExpanded
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExpanded ? "Hide Variants" : "Select Quantization"}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="p-5 border-t border-slate-800 bg-[#090d16]/80 rounded-b-2xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Available GGUF Quantization Formats</span>
                  <span className="font-mono text-[11px]">Downloads to D:/models</span>
                </div>
                {isFilesLoading ? (
                  <div className="py-6 text-center text-xs text-cyan-400 font-mono flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fetching quantization variants from HuggingFace...</span>
                  </div>
                ) : files && files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {files.map((file) => {
                      const isLocal = file.already_downloaded || models.some((m) => m.filename.toLowerCase() === file.filename.toLowerCase());
                      const isMmproj = file.is_mmproj || file.filename.toLowerCase().includes("mmproj");
                      return (
                        <div
                          key={file.rfilename || file.filename}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition ${
                            isMmproj ? "bg-[#111221] border-purple-900/40 hover:border-purple-800/60" : "bg-slate-900 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                isMmproj ? "bg-purple-950 text-purple-300 border border-purple-800/50" : "bg-cyan-950 text-cyan-300 border border-cyan-800/50"
                              }`}>{file.quantization}</span>
                              <span className="text-xs font-mono text-slate-300 font-medium">{file.size_gb} GB</span>
                            </div>
                            <p className="text-xs font-mono text-slate-200 mt-2 truncate font-semibold" title={file.filename}>{file.filename}</p>
                            {isMmproj && <span className="text-[10px] text-purple-300/80 font-mono mt-1 block">Multimodal Vision Projector</span>}
                          </div>
                          <div>
                            {isLocal ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Downloaded in D:/models</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartDownload(file.repo_id, file.filename, file.rfilename)}
                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-white text-xs font-semibold transition shadow-sm ${
                                  isMmproj ? "bg-purple-700 hover:bg-purple-600" : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                                }`}
                              >
                                <DownloadCloud className="w-3.5 h-3.5" />
                                <span>Download {isMmproj ? "Projector" : "GGUF"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">No .gguf files found in this repository.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-7 pb-36">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#10161f] border border-[#4c8dff]/40 px-4 py-3 text-xs text-[#9fe0ff] shadow-xl font-mono animate-bounce">
          <Check className="w-4 h-4 text-[#34d399]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(238,242,248,0.08)] pb-5">
        <div>
          <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#eef2f8] flex items-center gap-2.5 tracking-tight">
            <Layers className="w-6 h-6 text-[#4c8dff]" />
            Model Manager
          </h1>
          <p className="text-sm text-[#8a93a3] mt-1">
            Manage local weights, browse HuggingFace Hub, and download quantized GGUF models.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#10161f] rounded-xl border border-[rgba(238,242,248,0.08)] shrink-0 font-mono">
          <button
            onClick={() => setActiveTab("local")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "local"
                ? "bg-[#4c8dff] text-[#07090d] shadow-[0_0_15px_rgba(76,141,255,0.3)]"
                : "text-[#8a93a3] hover:text-[#eef2f8]"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local Library</span>
            <span className="px-1.5 rounded-full bg-black/20 text-[10px]">{models.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab("hub"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "hub"
                ? "bg-[#4c8dff] text-[#07090d] shadow-[0_0_15px_rgba(76,141,255,0.3)]"
                : "text-[#8a93a3] hover:text-[#eef2f8]"
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>HuggingFace Hub</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#4c8dff]/15 text-[#9fe0ff] text-[10px]">Phase 1.1</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {(modelsError || hubError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start justify-between gap-3 font-mono">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div><span className="font-semibold text-rose-200">Notice: </span><span>{modelsError || hubError}</span></div>
          </div>
          <button onClick={() => clearError()} className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══ LOCAL LIBRARY TAB ══════════════════════════════════════════════════════ */}
      {activeTab === "local" && (
        <div className="space-y-6">
          {/* Storage Banner */}
          <div className="p-4 rounded-xl bg-[#10161f]/80 border border-[rgba(238,242,248,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <FolderOpen className="w-4 h-4 text-[#4c8dff] shrink-0" />
              <span className="text-[#8a93a3]">
                Storage Directory: <code className="bg-[#4c8dff]/10 text-[#9fe0ff] px-2 py-0.5 rounded font-mono">D:/models</code>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#9fe0ff]">{activeModel ? "1 Active in RAM" : "0 Active in RAM"}</span>
              <button
                onClick={handleRescan}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c2634] hover:bg-[#1c2634]/80 border border-[rgba(238,242,248,0.1)] text-xs font-mono text-[#eef2f8] transition disabled:opacity-50"
                title="Scan D:/models directory for GGUF and PyTorch models"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-[#4c8dff]" : ""}`} />
                <span>{isScanning ? "Scanning..." : "Scan Directory"}</span>
              </button>
            </div>
          </div>

          {/* Models Grid */}
          <div className="space-y-4">
            {models.map((m) => {
              const isLoaded = m.loaded;
              const isThisLoading = loadingModelId === m.id;
              const isThisDeleting = deletingModelId === m.id;
              const isMmproj = m.is_mmproj || m.filename.toLowerCase().includes("mmproj");
              const isAsrOrSpeech = ["asr", "speech", "whisper", "conformer"].some((k) => m.filename.toLowerCase().includes(k));
              const isNonRunnable = isMmproj || isAsrOrSpeech;
              const isPyTorch = (m as any).format === "pytorch" || m.quantization?.toLowerCase() === "pytorch" || m.id.startsWith("pytorch::");
              const isConvertOpen = convertPanelModelId === m.id;
              // Find adapters compatible with this base model
              const compatibleAdapters = adapters.filter((a) =>
                (m as any).hf_repo_id
                  ? a.base_model_id === (m as any).hf_repo_id
                  : a.base_model_id.includes(m.filename)
              );

              return (
                <div key={m.id} className="flex flex-col">
                  {/* Model Card */}
                  <div
                    className={`rounded-2xl p-5 md:p-6 border transition-all flex flex-col justify-between min-h-[220px] ${
                      isPyTorch
                        ? "bg-[#0f1420]/80 border-amber-500/20 hover:border-amber-500/40"
                        : isLoaded
                        ? "bg-[#10161f]/90 border-[#4c8dff]/50 shadow-[0_0_25px_rgba(76,141,255,0.12)]"
                        : "bg-[#10161f]/50 border-[rgba(238,242,248,0.08)] hover:border-[rgba(238,242,248,0.18)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-display font-bold text-lg text-[#eef2f8] uppercase tracking-tight truncate" title={m.name}>{m.name}</h3>
                            {isPyTorch ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shrink-0">PyTorch</span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30 font-bold shrink-0">{m.quantization}</span>
                            )}
                            {isMmproj && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium shrink-0">Vision Projector</span>}
                            {isAsrOrSpeech && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium shrink-0">Speech / ASR</span>}
                          </div>
                          <p className="text-xs text-[#8a93a3] font-mono mt-1 truncate" title={m.filename}>
                            {isPyTorch ? `D:/models/pytorch/${m.filename}` : m.filename}
                          </p>
                          {isPyTorch && (m as any).hf_repo_id && (
                            <p className="text-[10px] text-amber-400/70 font-mono mt-0.5">{(m as any).hf_repo_id}</p>
                          )}
                        </div>
                        {isPyTorch ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-medium shrink-0">
                            <FileCode2 className="w-3.5 h-3.5" /><span>PyTorch</span>
                          </span>
                        ) : isLoaded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] text-xs font-mono font-medium shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /><span>Loaded</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#1c2634] border border-[rgba(238,242,248,0.08)] text-[#8a93a3] text-xs font-mono shrink-0">On Disk</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-[#07090d]/70 border border-[rgba(238,242,248,0.08)] text-xs">
                        <div><span className="text-[10px] uppercase text-[#8a93a3] font-mono font-semibold block">Weight Size</span><span className="font-mono text-[#eef2f8] font-medium">{m.size_gb} GB</span></div>
                        <div><span className="text-[10px] uppercase text-[#8a93a3] font-mono font-semibold block">Format</span><span className={`font-mono font-medium ${isPyTorch ? "text-amber-300" : "text-[#4c8dff]"}`}>{isPyTorch ? "HuggingFace" : "GGUF"}</span></div>
                        <div><span className="text-[10px] uppercase text-[#8a93a3] font-mono font-semibold block">{isPyTorch ? "Compatible Adapters" : "Hardware Engine"}</span><span className="font-mono text-[#eef2f8] font-medium">{isPyTorch ? `${compatibleAdapters.length} adapters` : "CPU (AVX2/16T)"}</span></div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-[rgba(238,242,248,0.08)] flex items-center justify-between">
                      <button
                        onClick={() => handleDeleteModel(m.id, m.name)}
                        disabled={isThisDeleting || isLoaded}
                        className="p-2 rounded-xl text-[#8a93a3] hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete from disk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isPyTorch ? (
                        <button
                          onClick={() => setConvertPanelModelId(isConvertOpen ? null : m.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>{isConvertOpen ? "Close Convert Panel" : "Convert to GGUF"}</span>
                          {isConvertOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : isNonRunnable ? (
                        <span className="px-3.5 py-2 rounded-xl bg-[#1c2634] border border-[rgba(238,242,248,0.08)] text-[#8a93a3] text-xs font-mono cursor-not-allowed">
                          {isMmproj ? "Vision Projector" : "Speech Model (Non-LLM)"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleLoad(m.id, isLoaded)}
                          disabled={isThisLoading || !isServerOnline}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isLoaded
                              ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-mono"
                              : "bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] shadow-[0_0_15px_rgba(76,141,255,0.25)] font-mono"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Power className={`w-3.5 h-3.5 ${isThisLoading ? "animate-spin" : ""}`} />
                          <span>{isThisLoading ? "Allocating RAM..." : isLoaded ? "Unload Model" : "Load into Memory"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Convert Panel — shown below card when open */}
                  {isPyTorch && isConvertOpen && (
                    <div className="mx-2 rounded-b-2xl border border-t-0 border-amber-500/20 bg-[#0a0f1a] p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-300 font-semibold uppercase tracking-widest mb-1">
                        <Wand2 className="w-3.5 h-3.5" />
                        GGUF Conversion Options
                      </div>

                      {/* Quantization */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase text-[#8a93a3] font-mono font-semibold tracking-wider">Quantization Format</label>
                        <div className="flex gap-2 flex-wrap">
                          {(["Q4_K_M", "Q8_0", "F16"] as const).map((q) => (
                            <button
                              key={q}
                              onClick={() => setConvertQuantization(q)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
                                convertQuantization === q
                                  ? "bg-amber-500/25 text-amber-200 border-amber-500/50"
                                  : "bg-[#1c2634] text-[#8a93a3] border-[rgba(238,242,248,0.08)] hover:border-amber-500/30"
                              }`}
                            >
                              {q}
                              {q === "Q4_K_M" && <span className="ml-1 text-[9px] text-amber-400/70">(rec.)</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Adapter selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase text-[#8a93a3] font-mono font-semibold tracking-wider">
                          Merge LoRA Adapter (optional)
                        </label>
                        <select
                          value={convertAdapterId}
                          onChange={(e) => setConvertAdapterId(e.target.value)}
                          className="w-full bg-[#1c2634] border border-[rgba(238,242,248,0.08)] rounded-xl px-3 py-2 text-xs font-mono text-[#eef2f8] focus:outline-none focus:border-amber-500/40"
                        >
                          <option value="">— Base model only (no adapter merge) —</option>
                          {compatibleAdapters.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} (r={a.lora_rank}, loss={a.final_loss?.toFixed(3)})</option>
                          ))}
                        </select>
                        {compatibleAdapters.length === 0 && (
                          <p className="text-[10px] text-[#8a93a3] font-mono">No compatible adapters found for this model.</p>
                        )}
                      </div>

                      {/* Progress bar (when converting) */}
                      {isConverting && convertPanelModelId === m.id && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono text-amber-300">
                            <span>{convertStep}</span>
                            <span>{convertProgress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1c2634] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                              style={{ width: `${convertProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {convertError && convertPanelModelId === m.id && (
                        <div className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                          {convertError}
                        </div>
                      )}

                      {/* Action button */}
                      <button
                        onClick={() => {
                          setConvertPanelModelId(m.id);
                          startConversion(m.id, convertQuantization, convertAdapterId || undefined);
                        }}
                        disabled={isConverting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold font-mono transition bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {isConverting && convertPanelModelId === m.id
                          ? `Converting... ${convertProgress.toFixed(0)}%`
                          : convertAdapterId
                          ? `Convert + Merge Adapter → ${convertQuantization}.gguf`
                          : `Convert to GGUF (${convertQuantization})`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Discover Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#10161f] via-[#1c2634]/40 to-[#10161f] border border-[rgba(238,242,248,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display font-bold uppercase text-base text-[#eef2f8] flex items-center gap-2 tracking-wide">
                <Sparkles className="w-4 h-4 text-[#4c8dff]" />
                Looking for more open-weight models?
              </h3>
              <p className="text-xs text-[#8a93a3]">
                Explore Qwen 2.5, Llama 3.2, DeepSeek R1, Mistral, and more — download GGUF quantizations directly from HuggingFace Hub.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("hub")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4c8dff]/15 hover:bg-[#4c8dff]/25 border border-[#4c8dff]/30 text-[#9fe0ff] text-xs font-mono font-semibold transition shrink-0"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Browse HuggingFace Hub</span>
            </button>
          </div>
        </div>
      )}


      {/* ══ HUGGINGFACE HUB TAB ════════════════════════════════════════════════════ */}
      {activeTab === "hub" && (
        <div className="space-y-6">

          {/* ── Format Mode Toggle: GGUF ↔ PyTorch ──────────────────────────────── */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 self-start w-fit">
            <button
              onClick={() => setHubMode("gguf")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition font-mono ${
                hubMode === "gguf"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              GGUF / Quantized
            </button>
            <button
              onClick={() => setHubMode("pytorch")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition font-mono ${
                hubMode === "pytorch"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              PyTorch / Safetensors
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold ml-0.5">Fine-tune</span>
            </button>
          </div>

          {/* ══════ GGUF MODE ══════════════════════════════════════════════════════ */}
          {hubMode === "gguf" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value) setSelectedFamily(null);
                  }}
                  placeholder={selectedFamily ? `Searching "${selectedFamily.name}" — or type to refine...` : "Select a model family below, or search for any GGUF model (e.g. Qwen2.5, Llama-3.2, Mistral, DeepSeek)..."}
                  className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/80 pl-11 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                {(query || selectedFamily) && (
                  <button
                    onClick={() => { setSelectedFamily(null); setQuery(""); }}
                    className="absolute right-4 top-3.5 p-0.5 text-slate-400 hover:text-white transition"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* MODE A: Home — Model Family Cards */}
              {!selectedFamily && !query && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Popular Model Families
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-[11px] text-slate-500">Click a family to browse all quantizations</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {MODEL_FAMILIES.map((family) => (
                      <button
                        key={family.id}
                        onClick={() => handleFamilySelect(family)}
                        className={`relative text-left rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.99] ${family.bg} ${family.border}`}
                      >
                        {family.badge && (
                          <span className="absolute top-3 right-3 text-[9px] font-bold tracking-wide text-slate-400 font-mono">{family.badge}</span>
                        )}
                        <div className={`mb-3 ${family.accent}`}>{family.icon}</div>
                        <h3 className={`font-bold text-sm ${family.accent} mb-0.5 leading-tight`}>{family.name}</h3>
                        <p className="text-[11px] text-slate-500 mb-3 font-mono leading-snug">{family.subtitle}</p>
                        <div className="flex flex-wrap gap-1">
                          {family.tags.map((tag) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODE B: Family Selected — breadcrumb + results */}
              {(selectedFamily || query) && (
                <div className="space-y-4">
                  {selectedFamily && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={handleBackToFamilies}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        All Families
                      </button>
                      <span className="text-slate-700">/</span>
                      <span className={`text-xs font-bold ${selectedFamily.accent}`}>{selectedFamily.name}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">Showing all GGUF repositories</span>
                    </div>
                  )}

                  {!selectedFamily && query && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500 text-[11px] font-semibold uppercase shrink-0">Families:</span>
                      {MODEL_FAMILIES.slice(0, 8).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleFamilySelect(f)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition font-medium text-[11px]"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {renderRepoList()}
                </div>
              )}
            </div>
          )}

          {/* ══════ PYTORCH MODE ═══════════════════════════════════════════════════ */}
          {hubMode === "pytorch" && (
            <div className="space-y-5">

              {/* Info Banner */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Package className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <p className="text-amber-200 font-semibold">Full PyTorch / Safetensors Models</p>
                    <p className="text-slate-400">Downloads the entire HuggingFace repo to <code className="bg-amber-500/10 text-amber-300 px-1 rounded font-mono">D:/models/pytorch/</code> — ready for fine-tuning and GGUF conversion.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 shrink-0 flex-wrap sm:flex-col sm:items-end">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />Fine-tune with LoRA</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />Convert → GGUF</span>
                </div>
              </div>

              {/* PyTorch Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/60" />
                <input
                  type="text"
                  value={ptQuery}
                  onChange={(e) => setPtQuery(e.target.value)}
                  placeholder="Search for any PyTorch model (e.g. Qwen2.5, Llama-3.2, Mistral, phi-3)..."
                  className="w-full rounded-2xl bg-slate-900/90 border border-amber-800/40 pl-11 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 shadow-inner"
                />
                {ptQuery && (
                  <button
                    onClick={() => setPtQuery("")}
                    className="absolute right-4 top-3.5 p-0.5 text-slate-400 hover:text-white transition"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Searching spinner */}
              {ptIsSearching && (
                <div className="py-10 flex items-center justify-center gap-3 text-xs text-amber-400 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching HuggingFace Hub for PyTorch models...</span>
                </div>
              )}

              {/* Error */}
              {ptError && !ptIsSearching && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
                  {ptError}
                </div>
              )}

              {/* Results */}
              {!ptIsSearching && (
                <div className="space-y-3">
                  {!ptQuery && (
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">Featured Models</span>
                      <div className="flex-1 h-px bg-amber-900/30" />
                      <span className="text-[11px] text-slate-600">Click to preview • Download full repo</span>
                    </div>
                  )}

                  {ptResults.length === 0 && !ptIsSearching && (
                    <div className="py-10 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-500 text-sm">
                      No PyTorch models found. Try a different search term.
                    </div>
                  )}

                  {ptResults.map((repo) => {
                    const isExpanded = ptExpandedRepoId === repo.repo_id;
                    const repoInfo = repoInfoByRepo[repo.repo_id];
                    const isLoading = ptLoadingRepoId === repo.repo_id;
                    const alreadyDl = repoInfo?.already_downloaded ?? (repo as any).already_downloaded ?? false;

                    return (
                      <div
                        key={repo.repo_id}
                        className={`rounded-2xl border transition-all ${
                          isExpanded
                            ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
                            : "bg-slate-900/40 border-slate-800/80 hover:border-amber-800/50"
                        }`}
                      >
                        {/* Repo header row */}
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-base text-white tracking-tight">{repo.model_name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">PyTorch</span>
                              {(repo as any).featured && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-300" /> Curated
                                </span>
                              )}
                              {alreadyDl && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Downloaded
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{repo.repo_id}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <DownloadCloud className="w-3.5 h-3.5 text-amber-400" />
                                {(repo.downloads ?? 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 text-rose-400" />
                                {(repo.likes ?? 0).toLocaleString()}
                              </span>
                              {(repo as any).size_gb && (
                                <span className="text-slate-500">{(repo as any).size_gb} GB</span>
                              )}
                              {repo.pipeline_tag && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Tag className="w-3.5 h-3.5" />{repo.pipeline_tag}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`https://huggingface.co/${repo.repo_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                              title="View on HuggingFace"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => fetchRepoInfo(repo.repo_id)}
                              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                                isExpanded
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700"
                              }`}
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>{isExpanded ? "Hide Details" : "Preview & Download"}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded details panel */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-amber-900/30 bg-[#090d16]/80 rounded-b-2xl space-y-4 pt-4">
                            {isLoading ? (
                              <div className="py-6 text-center text-xs text-amber-400 font-mono flex items-center justify-center space-x-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Fetching model info from HuggingFace...</span>
                              </div>
                            ) : repoInfo ? (
                              <>
                                {/* Size + path info */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                    <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Weight Size</span>
                                    <span className="text-amber-300 font-semibold">{repoInfo.size_gb ? `${repoInfo.size_gb} GB` : "Unknown"}</span>
                                  </div>
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                    <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Format</span>
                                    <span className="text-white font-semibold">Safetensors</span>
                                  </div>
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                    <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Dest Folder</span>
                                    <span className="text-slate-300 text-[11px] truncate block" title={repoInfo.dest_path}>
                                      D:/models/pytorch/{repoInfo.model_name}
                                    </span>
                                  </div>
                                </div>

                                {/* Tags */}
                                {repoInfo.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {repoInfo.tags.slice(0, 10).map((t) => (
                                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">{t}</span>
                                    ))}
                                  </div>
                                )}

                                {/* File list preview */}
                                {repoInfo.files.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase text-slate-500 font-mono font-semibold tracking-wider">Files included in download</span>
                                    <div className="rounded-xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden max-h-40 overflow-y-auto">
                                      {repoInfo.files.map((f) => (
                                        <div key={f.filename} className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono bg-slate-900/60 hover:bg-slate-900">
                                          <span className="text-slate-300 truncate max-w-[70%]" title={f.filename}>{f.filename}</span>
                                          <span className="text-slate-500 shrink-0 ml-2">
                                            {f.size_bytes > 0 ? `${(f.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Download button */}
                                <div className="pt-1">
                                  {alreadyDl ? (
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold font-mono py-2.5">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Already downloaded to D:/models/pytorch/{repoInfo.model_name}</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handlePytorchDownload(repo.repo_id)}
                                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold font-mono transition bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20"
                                    >
                                      <DownloadCloud className="w-4 h-4" />
                                      Download Full Repo — {repoInfo.size_gb ? `${repoInfo.size_gb} GB` : repo.repo_id.split("/").pop()}
                                    </button>
                                  )}
                                  <p className="text-[10px] text-slate-600 font-mono text-center mt-2">
                                    Saves to D:/models/pytorch/{repoInfo.model_name} • Progress shown in overlay below
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-slate-500 text-center py-4 font-mono">Failed to load repo info.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
