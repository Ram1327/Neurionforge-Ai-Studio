"use client";

import React, { useEffect } from "react";
import {
  DownloadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { DownloadJob } from "@neurionforge/shared-types";

interface DownloadProgressCardProps {
  job: DownloadJob;
  onCancel: (jobId: string) => void;
  onDismiss: (jobId: string) => void;
}

function formatEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
}

export function DownloadProgressCard({ job, onCancel, onDismiss }: DownloadProgressCardProps) {
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const isDone = job.status === "done";
  const isCancelled = job.status === "cancelled";
  const isFailed = job.status === "failed";
  const isTerminal = isDone || isCancelled || isFailed;

  // Auto-dismiss completed, cancelled, or failed cards after 8 seconds
  useEffect(() => {
    if (isTerminal) {
      const timer = setTimeout(() => {
        onDismiss(job.job_id);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isTerminal, job.job_id, onDismiss]);

  const displayPercent = isDone
    ? 100
    : Math.min(100, Math.max(0, job.percent || (job.total_bytes ? (job.bytes_downloaded / job.total_bytes) * 100 : 0)));

  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xl shadow-black/70 space-y-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
        isDone
          ? "bg-[#10161f] border-[#34d399]/40"
          : isFailed || isCancelled
          ? "bg-[#180e12] border-rose-500/40"
          : "bg-[#10161f] border-[rgba(238,242,248,0.1)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDone
                ? "bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30"
                : isFailed || isCancelled
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-[#4c8dff]/20 text-[#9fe0ff] border border-[#4c8dff]/30"
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isFailed || isCancelled ? (
              <AlertCircle className="w-5 h-5" />
            ) : isQueued ? (
              <Clock className="w-5 h-5 animate-pulse" />
            ) : (
              <DownloadCloud className="w-5 h-5 animate-bounce" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#eef2f8] truncate max-w-md" title={job.filename}>
              {job.filename}
            </h4>
            <p className="text-[11px] text-[#8a93a3] font-mono truncate">{job.repo_id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Status Badge */}
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
              isDone
                ? "bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/30"
                : isRunning
                ? "bg-[#4c8dff]/15 text-[#9fe0ff] border border-[#4c8dff]/30 animate-pulse"
                : isQueued
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : isCancelled
                ? "bg-[#1c2634] text-[#8a93a3] border border-[rgba(238,242,248,0.08)]"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
            }`}
          >
            {isDone
              ? "Completed"
              : isRunning
              ? "Downloading"
              : isQueued
              ? "Queued"
              : isCancelled
              ? "Cancelled"
              : "Failed"}
          </span>

          {/* Action Button: Cancel when downloading, Dismiss when finished */}
          {isRunning || isQueued ? (
            <button
              onClick={() => onCancel(job.job_id)}
              className="p-1 rounded-lg text-[#8a93a3] hover:bg-[#1c2634] hover:text-rose-400 transition"
              title="Cancel Download"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onDismiss(job.job_id)}
              className="p-1 rounded-lg text-[#8a93a3] hover:bg-[#1c2634] hover:text-[#eef2f8] transition"
              title="Dismiss Card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-[#1c2634] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isDone
                ? "bg-[#34d399]"
                : isFailed || isCancelled
                ? "bg-rose-500"
                : "bg-gradient-to-r from-[#4c8dff] to-[#9fe0ff]"
            }`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8a93a3]">
          <div className="flex items-center space-x-2">
            <span>{displayPercent.toFixed(1)}%</span>
            <span>•</span>
            <span>
              {formatBytes(isDone ? job.total_bytes || job.bytes_downloaded : job.bytes_downloaded)} / {formatBytes(job.total_bytes || job.bytes_downloaded)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isRunning && (
              <>
                <span className="flex items-center gap-1 text-[#9fe0ff]">
                  <Zap className="w-3 h-3 text-[#4c8dff]" />
                  {job.speed_mbps ? `${job.speed_mbps.toFixed(1)} MB/s` : "Starting..."}
                </span>
                {job.eta_sec ? (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#8a93a3]">
                      <Clock className="w-3 h-3 text-[#7fb4ff]" />
                      ETA {formatEta(job.eta_sec)}
                    </span>
                  </>
                ) : null}
              </>
            )}
            {isDone && <span className="text-[#34d399] font-semibold">✓ Saved to D:/models</span>}
            {isFailed && <span className="text-rose-400 truncate max-w-xs">{job.error || "Download error"}</span>}
            {isCancelled && <span className="text-[#8a93a3]">Download cancelled</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
