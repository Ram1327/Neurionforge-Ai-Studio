"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wand2,
  Database,
  Play,
  Square,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Flame,
  FileCode,
  ArrowRight,
  RefreshCw,
  Terminal as TerminalIcon,
  Sliders,
  Sparkles,
  DownloadCloud,
} from "lucide-react";
import { useDatasets } from "@/hooks/useDatasets";
import { useFineTuneJob } from "@/hooks/useFineTuneJob";
import { useModels } from "@/hooks/useModels";
import { LossChart } from "@/components/LossChart";
import { TrainRequest } from "@neurionforge/shared-types";

export default function FineTunePage() {
  const {
    datasets,
    isLoading: isDatasetsLoading,
    isUploading,
    uploadDataset,
    deleteDataset,
    validateDataset,
    refresh: refreshDatasets,
  } = useDatasets();

  const {
    models,
    isLoading: isModelsLoading,
    refresh: refreshModels,
  } = useModels();

  const {
    jobs,
    activeJob,
    setActiveJob,
    logs,
    lossHistory,
    isStarting,
    isCancelling,
    error: jobError,
    startJob,
    cancelJob,
    deleteJob,
  } = useFineTuneJob();

  // Filter only local PyTorch models available in directory
  const pytorchModels = models.filter(
    (m) =>
      (m as any).format === "pytorch" ||
      m.quantization?.toLowerCase() === "pytorch" ||
      m.id.startsWith("pytorch::")
  );

  // Dataset upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetContent, setNewDatasetContent] = useState("");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error: string; row_count: number; format: string } | null>(null);

  // Job Configurator state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [baseModelId, setBaseModelId] = useState<string>("");
  const [adapterName, setAdapterName] = useState<string>("qwen-neurion-lora-v1");
  const [loraRank, setLoraRank] = useState<number>(16);
  const [loraAlpha, setLoraAlpha] = useState<number>(32);
  const [learningRate, setLearningRate] = useState<number>(0.0002);
  const [epochs, setEpochs] = useState<number>(3);
  const [batchSize] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<"fast" | "balanced" | "quality">("balanced");
  const [customParamsOpen, setCustomParamsOpen] = useState(false);

  // Synchronize baseModelId with available local PyTorch models
  useEffect(() => {
    if (pytorchModels.length > 0) {
      const exists = pytorchModels.some(
        (m) => ((m as any).hf_repo_id || m.filename) === baseModelId || m.id === baseModelId
      );
      if (!exists || !baseModelId) {
        const defaultVal = (pytorchModels[0] as any).hf_repo_id || pytorchModels[0].filename;
        setBaseModelId(defaultVal);
      }
    } else {
      setBaseModelId("");
    }
  }, [models]);

  // Presets handler
  const applyPreset = (preset: "fast" | "balanced" | "quality") => {
    setSelectedPreset(preset);
    if (preset === "fast") {
      setLoraRank(4);
      setLoraAlpha(8);
      setEpochs(1);
      setLearningRate(0.0002);
    } else if (preset === "balanced") {
      setLoraRank(16);
      setLoraAlpha(32);
      setEpochs(3);
      setLearningRate(0.0002);
    } else if (preset === "quality") {
      setLoraRank(32);
      setLoraAlpha(64);
      setEpochs(5);
      setLearningRate(0.0001);
    }
  };

  const handleValidateContent = async (text: string) => {
    setNewDatasetContent(text);
    if (!text.trim()) {
      setValidationResult(null);
      return;
    }
    const res = await validateDataset(text);
    setValidationResult(res);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName || !newDatasetContent) return;
    const ds = await uploadDataset(newDatasetName, newDatasetContent);
    if (ds) {
      setSelectedDatasetId(ds.id);
      setShowUploadModal(false);
      setNewDatasetName("");
      setNewDatasetContent("");
      setValidationResult(null);
    }
  };

  const handleStartTraining = async () => {
    if (!baseModelId || pytorchModels.length === 0) {
      alert("No local PyTorch base model selected. Please download a model from Model Manager first.");
      return;
    }

    const targetDataset = selectedDatasetId || (datasets.length > 0 ? datasets[0].id : "");
    if (!targetDataset) {
      alert("Please select or upload a dataset first.");
      return;
    }

    const payload: TrainRequest = {
      base_model_id: baseModelId,
      dataset_id: targetDataset,
      adapter_name: adapterName.trim() || `lora-${Date.now()}`,
      lora_rank: loraRank,
      lora_alpha: loraAlpha,
      learning_rate: learningRate,
      epochs: epochs,
      batch_size: batchSize,
      target_modules: ["q_proj", "v_proj"],
    };

    try {
      await startJob(payload);
    } catch (err: any) {
      const msg = err?.message || "Failed to start training job.";
      alert(msg);
    }
  };

  // Status helpers
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4c8dff]" /> Running
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#8a93a3]/15 text-[#8a93a3] border border-[#8a93a3]/30">
            Idle
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[rgba(238,242,248,0.08)] bg-[#10161f]/90 px-4 py-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#4c8dff]/10 border border-[#4c8dff]/25 text-[#9fe0ff]">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg md:text-xl uppercase tracking-wider text-[#eef2f8]">
              Fine-Tuning Studio
            </h1>
            <p className="text-xs text-[#8a93a3] font-mono">
              PEFT / LoRA Adapter Training Engine · CPU Accelerated
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/adapters"
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-[rgba(238,242,248,0.08)] bg-[#1c2634]/60 hover:bg-[#1c2634] text-[#eef2f8] transition"
          >
            <Layers className="w-3.5 h-3.5 text-[#4c8dff]" />
            <span>Adapter Library</span>
            <ArrowRight className="w-3 h-3 text-[#8a93a3]" />
          </Link>
        </div>
      </div>

      {/* Main 3-Panel Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-y-auto min-h-0">
        
        {/* ===================================================================
            PANEL 1: DATASET MANAGER (3 Cols)
            =================================================================== */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/70 backdrop-blur-md p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(238,242,248,0.08)] mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#4c8dff]" />
              <h2 className="font-display font-bold text-sm tracking-wider uppercase text-[#eef2f8]">
                Datasets ({datasets.length})
              </h2>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg bg-[#4c8dff]/15 hover:bg-[#4c8dff]/25 text-[#9fe0ff] border border-[#4c8dff]/30 transition"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isDatasetsLoading ? (
              <div className="text-center py-8 font-mono text-xs text-[#8a93a3]">
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="text-center py-8 px-2 font-mono text-xs text-[#8a93a3]">
                No datasets yet. Click <strong>Import</strong> to upload a JSONL file.
              </div>
            ) : (
              datasets.map((ds) => {
                const isSelected = (selectedDatasetId === ds.id) || (!selectedDatasetId && datasets[0].id === ds.id);
                return (
                  <div
                    key={ds.id}
                    onClick={() => setSelectedDatasetId(ds.id)}
                    className={`cursor-pointer group flex flex-col p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#1c2634] border-[#4c8dff]/40 shadow-[0_0_12px_rgba(76,141,255,0.08)]"
                        : "bg-[#07090d]/40 border-[rgba(238,242,248,0.06)] hover:border-[rgba(238,242,248,0.15)] hover:bg-[#1c2634]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-[#eef2f8] truncate pr-2" title={ds.name}>
                        {ds.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDataset(ds.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#8a93a3] hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8a93a3] mt-2">
                      <span className="text-[#9fe0ff] bg-[#4c8dff]/10 px-1.5 py-0.2 rounded border border-[#4c8dff]/20">
                        {ds.row_count} rows
                      </span>
                      <span>{(ds.size_bytes / 1024).toFixed(1)} KB</span>
                      <span className="uppercase text-[10px] text-[#8a93a3]">{ds.format}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===================================================================
            PANEL 2: JOB CONFIGURATOR & PRESETS (4 Cols)
            =================================================================== */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(238,242,248,0.08)] mb-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#4c8dff]" />
              <h2 className="font-display font-bold text-sm tracking-wider uppercase text-[#eef2f8]">
                Training Configurator
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4c8dff]/10 text-[#9fe0ff] border border-[#4c8dff]/25">
              QLoRA / PEFT
            </span>
          </div>

          <div className="space-y-4">
            {/* Target Adapter Name */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#8a93a3] mb-1.5">
                Adapter Output Name
              </label>
              <input
                type="text"
                value={adapterName}
                onChange={(e) => setAdapterName(e.target.value)}
                placeholder="e.g. qwen-neurion-v1"
                className="w-full rounded-xl border border-[rgba(238,242,248,0.1)] bg-[#07090d]/80 px-3 py-2 text-xs font-mono text-[#eef2f8] focus:border-[#4c8dff] focus:outline-none"
              />
            </div>

            {/* Base Model — Only shows PyTorch models present in local directory */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono uppercase text-[#8a93a3]">
                  Base Model (Local PyTorch)
                </label>
                {pytorchModels.length > 0 && (
                  <span className="text-[10px] font-mono text-[#34d399] bg-[#34d399]/10 px-1.5 py-0.2 rounded border border-[#34d399]/20">
                    {pytorchModels.length} in D:/models
                  </span>
                )}
              </div>

              {isModelsLoading ? (
                <div className="p-2.5 rounded-xl border border-[rgba(238,242,248,0.08)] bg-[#07090d]/80 text-xs font-mono text-[#8a93a3]">
                  Scanning models...
                </div>
              ) : pytorchModels.length > 0 ? (
                <select
                  value={baseModelId}
                  onChange={(e) => setBaseModelId(e.target.value)}
                  className="w-full rounded-xl border border-[rgba(238,242,248,0.1)] bg-[#07090d]/80 px-3 py-2 text-xs font-mono text-[#eef2f8] focus:border-[#4c8dff] focus:outline-none"
                >
                  {pytorchModels.map((m) => {
                    const modelVal = (m as any).hf_repo_id || m.filename;
                    return (
                      <option key={m.id} value={modelVal}>
                        {m.name} ({m.size_gb} GB)
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>No PyTorch models in directory</span>
                  </div>
                  <p className="text-[11px] font-mono text-[#8a93a3] leading-relaxed">
                    No PyTorch / Safetensors models found in <code className="text-[#9fe0ff]">D:/models/pytorch/</code>. Download one from HuggingFace Hub to start training.
                  </p>
                  <Link
                    href="/models"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#4c8dff] hover:text-[#9fe0ff] hover:underline font-semibold pt-1"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Go to Model Manager (HuggingFace Hub) →</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Hyperparameter Presets */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#8a93a3] mb-1.5">
                Training Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("fast")}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    selectedPreset === "fast"
                      ? "bg-[#4c8dff]/15 border-[#4c8dff] text-[#9fe0ff]"
                      : "bg-[#07090d]/60 border-[rgba(238,242,248,0.06)] text-[#8a93a3] hover:text-[#eef2f8]"
                  }`}
                >
                  <span className="font-semibold text-xs">Fast</span>
                  <span className="text-[10px] font-mono opacity-80">Rank 4 · 1 Ep</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("balanced")}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    selectedPreset === "balanced"
                      ? "bg-[#4c8dff]/15 border-[#4c8dff] text-[#9fe0ff]"
                      : "bg-[#07090d]/60 border-[rgba(238,242,248,0.06)] text-[#8a93a3] hover:text-[#eef2f8]"
                  }`}
                >
                  <span className="font-semibold text-xs">Balanced</span>
                  <span className="text-[10px] font-mono opacity-80">Rank 16 · 3 Ep</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("quality")}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    selectedPreset === "quality"
                      ? "bg-[#4c8dff]/15 border-[#4c8dff] text-[#9fe0ff]"
                      : "bg-[#07090d]/60 border-[rgba(238,242,248,0.06)] text-[#8a93a3] hover:text-[#eef2f8]"
                  }`}
                >
                  <span className="font-semibold text-xs">Quality</span>
                  <span className="text-[10px] font-mono opacity-80">Rank 32 · 5 Ep</span>
                </button>
              </div>
            </div>

            {/* Custom Parameters Expandable */}
            <div className="border border-[rgba(238,242,248,0.08)] rounded-xl p-3 bg-[#07090d]/40">
              <button
                type="button"
                onClick={() => setCustomParamsOpen(!customParamsOpen)}
                className="flex items-center justify-between w-full text-xs font-mono text-[#8a93a3] hover:text-[#eef2f8]"
              >
                <span>Advanced Hyperparameters</span>
                <span>{customParamsOpen ? "−" : "+"}</span>
              </button>

              {customParamsOpen && (
                <div className="space-y-3 pt-3 mt-3 border-t border-[rgba(238,242,248,0.06)]">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#8a93a3] mb-1">
                      <span>LoRA Rank (r): {loraRank}</span>
                      <span>Alpha: {loraAlpha}</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="64"
                      step="4"
                      value={loraRank}
                      onChange={(e) => {
                        const r = parseInt(e.target.value);
                        setLoraRank(r);
                        setLoraAlpha(r * 2);
                      }}
                      className="w-full accent-[#4c8dff]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#8a93a3] mb-1">
                      <span>Epochs: {epochs}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value))}
                      className="w-full accent-[#4c8dff]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8a93a3] mb-1">
                      Learning Rate
                    </label>
                    <input
                      type="number"
                      step="0.00005"
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-[rgba(238,242,248,0.1)] bg-[#07090d] px-2.5 py-1 text-xs font-mono text-[#eef2f8]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Profile Notice */}
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-[#4c8dff]/5 border border-[#4c8dff]/15 text-[11px] font-mono text-[#8a93a3]">
              <Cpu className="w-4 h-4 text-[#4c8dff] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#eef2f8] font-semibold">CPU Execution Profile:</span> Training uses float32/QLoRA weights with gradient accumulation. Expect 1-3 min per epoch for small datasets.
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartTraining}
              disabled={isStarting || activeJob?.status === "running" || pytorchModels.length === 0}
              className={`w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg transition ${
                activeJob?.status === "running" || pytorchModels.length === 0
                  ? "bg-[#1c2634] text-[#8a93a3] cursor-not-allowed border border-[rgba(238,242,248,0.08)]"
                  : "bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] shadow-[0_0_20px_rgba(76,141,255,0.3)]"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isStarting
                  ? "Initializing..."
                  : pytorchModels.length === 0
                  ? "No PyTorch Model Available"
                  : "Start LoRA Fine-Tuning"}
              </span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            PANEL 3: REAL-TIME TELEMETRY, LOSS & LOGS (5 Cols)
            =================================================================== */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/70 backdrop-blur-md p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(238,242,248,0.08)] mb-3">
            <div className="flex items-center space-x-2">
              <TerminalIcon className="w-4 h-4 text-[#4c8dff]" />
              <h2 className="font-display font-bold text-sm tracking-wider uppercase text-[#eef2f8]">
                Training Monitor
              </h2>
            </div>
            <div>{getStatusBadge(activeJob?.status)}</div>
          </div>

          {activeJob ? (
            <div className="flex-1 flex flex-col space-y-3 min-h-0">
              {/* Job Header Stats */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#07090d]/60 border border-[rgba(238,242,248,0.06)] text-xs font-mono">
                <div>
                  <span className="text-[#8a93a3] block text-[10px]">Adapter</span>
                  <span className="font-semibold text-[#eef2f8] truncate block" title={activeJob.adapter_name}>
                    {activeJob.adapter_name}
                  </span>
                </div>
                <div>
                  <span className="text-[#8a93a3] block text-[10px]">Step / Total</span>
                  <span className="font-semibold text-[#9fe0ff]">
                    {activeJob.current_step} / {activeJob.total_steps || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8a93a3] block text-[10px]">Loss</span>
                  <span className="font-semibold text-[#4c8dff]">
                    {activeJob.current_loss !== null && activeJob.current_loss !== undefined
                      ? activeJob.current_loss.toFixed(4)
                      : activeJob.final_loss !== null && activeJob.final_loss !== undefined
                      ? activeJob.final_loss.toFixed(4)
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Real-time Loss SVG Chart */}
              <LossChart data={lossHistory} height={160} />

              {/* Terminal Logs Viewer */}
              <div className="flex-1 flex flex-col rounded-xl border border-[rgba(238,242,248,0.08)] bg-[#07090d] p-3 min-h-[140px] overflow-hidden">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[rgba(238,242,248,0.06)] text-[10px] font-mono text-[#8a93a3]">
                  <span>Live Execution Stream</span>
                  {activeJob.status === "running" && (
                    <button
                      onClick={() => cancelJob(activeJob.job_id)}
                      disabled={isCancelling}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Cancel Job</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 text-[#eef2f8]/90">
                  {logs.length === 0 ? (
                    <div className="text-[#8a93a3] italic">No log lines emitted yet...</div>
                  ) : (
                    logs.map((l, idx) => (
                      <div key={idx} className="leading-tight">
                        <span className="text-[#8a93a3] select-none pr-2">[{l.elapsed_sec}s]</span>
                        {l.message ? (
                          <span className={l.status === "failed" ? "text-rose-400" : l.status === "completed" ? "text-[#34d399]" : "text-[#eef2f8]"}>
                            {l.message}
                          </span>
                        ) : (
                          <span>Step {l.step}/{l.total_steps} — Loss: <strong className="text-[#4c8dff]">{l.loss?.toFixed(4)}</strong> (Epoch {l.epoch})</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs text-[#8a93a3]">
              <Sparkles className="w-8 h-8 text-[#4c8dff]/40 mb-3" />
              <p>No active training session.</p>
              <p className="text-[11px] mt-1 text-[#8a93a3]/70">
                {pytorchModels.length === 0
                  ? "Download a PyTorch model from Model Manager to begin."
                  : "Select a dataset and click Start LoRA Fine-Tuning to begin."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dataset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090d]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(238,242,248,0.12)] bg-[#10161f] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(238,242,248,0.08)] mb-4">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#4c8dff]" />
                <h3 className="font-display font-bold text-base uppercase text-[#eef2f8]">
                  Import JSONL Dataset
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#8a93a3] hover:text-[#eef2f8] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8a93a3] mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  required
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder="e.g. Neurion Q&A Pairs"
                  className="w-full rounded-xl border border-[rgba(238,242,248,0.1)] bg-[#07090d] px-3 py-2 text-xs font-mono text-[#eef2f8] focus:border-[#4c8dff] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-[#8a93a3]">
                    JSONL Content (Paste rows)
                  </label>
                  {validationResult && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded border ${
                        validationResult.valid
                          ? "bg-[#34d399]/15 text-[#34d399] border-[#34d399]/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {validationResult.valid
                        ? `✓ Valid (${validationResult.row_count} rows, ${validationResult.format})`
                        : `✗ ${validationResult.error}`}
                    </span>
                  )}
                </div>
                <textarea
                  rows={6}
                  required
                  value={newDatasetContent}
                  onChange={(e) => handleValidateContent(e.target.value)}
                  placeholder={`{"messages": [{"role": "user", "content": "What is NeurionForge?"}, {"role": "assistant", "content": "A local AI Studio."}]}\n{"messages": [{"role": "user", "content": "Explain LoRA"}, {"role": "assistant", "content": "Low-Rank Adaptation."}]}`}
                  className="w-full rounded-xl border border-[rgba(238,242,248,0.1)] bg-[#07090d] p-3 text-xs font-mono text-[#eef2f8] focus:border-[#4c8dff] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-mono text-[#8a93a3] hover:text-[#eef2f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (validationResult !== null && !validationResult.valid)}
                  className="px-4 py-2 rounded-xl bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] font-display font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {isUploading ? "Saving..." : "Save Dataset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
