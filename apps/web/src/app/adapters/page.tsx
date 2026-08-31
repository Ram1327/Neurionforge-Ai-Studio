"use client";

import React from "react";
import Link from "next/link";
import { Layers, Wand2, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { useAdapters } from "@/hooks/useAdapters";

export default function AdaptersPage() {
  const { adapters, isLoading, deletingId, error, refresh, deleteAdapter } =
    useAdapters();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(238,242,248,0.08)] bg-[#10161f]/90 px-4 py-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#4c8dff]/10 border border-[#4c8dff]/25 text-[#9fe0ff]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg md:text-xl uppercase tracking-wider text-[#eef2f8]">
              Trained LoRA Adapters
            </h1>
            <p className="text-xs text-[#8a93a3] font-mono">
              Manage trained PEFT adapters — convert to GGUF or delete
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-[rgba(238,242,248,0.08)] bg-[#1c2634]/60 hover:bg-[#1c2634] text-[#eef2f8] transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#8a93a3]" />
            <span>Refresh</span>
          </button>
          <Link
            href="/finetune"
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] font-bold transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Fine-Tune New Adapter</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 font-mono text-xs text-[#8a93a3]">
            <div className="h-2 w-2 rounded-full bg-[#4c8dff] animate-ping mb-3" />
            <span>Scanning adapter repository...</span>
          </div>
        ) : adapters.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-4 rounded-2xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/60 backdrop-blur-md">
            <Sparkles className="w-10 h-10 text-[#4c8dff]/40 mx-auto mb-3" />
            <h3 className="font-display font-bold text-base uppercase text-[#eef2f8] mb-1">
              No Adapters Trained Yet
            </h3>
            <p className="text-xs font-mono text-[#8a93a3] mb-5">
              Fine-tune your first LoRA adapter on your own data in the Fine-Tuning Studio.
            </p>
            <Link
              href="/finetune"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4c8dff] hover:bg-[#7fb4ff] text-[#07090d] font-display font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(76,141,255,0.3)]"
            >
              <Wand2 className="w-4 h-4" />
              <span>Go to Fine-Tuning Studio</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {adapters.map((adapter) => (
              <div
                key={adapter.id}
                className="group flex flex-col justify-between rounded-2xl border border-[rgba(238,242,248,0.08)] bg-[#10161f]/80 backdrop-blur-md p-5 transition hover:border-[#4c8dff]/30 hover:shadow-[0_0_20px_rgba(76,141,255,0.06)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-display font-bold text-base uppercase tracking-wide text-[#eef2f8] group-hover:text-[#9fe0ff] transition">
                        {adapter.name}
                      </h3>
                      <p
                        className="text-[11px] font-mono text-[#8a93a3] truncate"
                        title={adapter.base_model_id}
                      >
                        Base: {adapter.base_model_id}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-[#4c8dff]/10 text-[#9fe0ff] border border-[#4c8dff]/25">
                      LoRA
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 my-4 text-xs font-mono">
                    <div className="p-2 rounded-xl bg-[#07090d]/60 border border-[rgba(238,242,248,0.06)]">
                      <span className="text-[10px] text-[#8a93a3] block">Rank / Alpha</span>
                      <span className="font-semibold text-[#eef2f8]">
                        r={adapter.lora_rank || 16} · α={adapter.lora_alpha || 32}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#07090d]/60 border border-[rgba(238,242,248,0.06)]">
                      <span className="text-[10px] text-[#8a93a3] block">Adapter Size</span>
                      <span className="font-semibold text-[#9fe0ff]">{adapter.size_mb} MB</span>
                    </div>
                    {adapter.final_loss !== null && adapter.final_loss !== undefined && (
                      <div className="p-2 rounded-xl bg-[#07090d]/60 border border-[rgba(238,242,248,0.06)] col-span-2">
                        <span className="text-[10px] text-[#8a93a3] block">Final Training Loss</span>
                        <span className="font-semibold text-[#4c8dff]">
                          {adapter.final_loss.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions — Delete only */}
                <div className="flex items-center justify-end pt-3 border-t border-[rgba(238,242,248,0.08)] mt-2">
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete adapter "${adapter.name}" and all its local weights?`
                        )
                      ) {
                        deleteAdapter(adapter.id);
                      }
                    }}
                    disabled={deletingId === adapter.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-[#8a93a3] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition disabled:opacity-40"
                    title="Delete adapter"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deletingId === adapter.id ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
