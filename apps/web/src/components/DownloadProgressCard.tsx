"use client";

import React from "react";
import {
  DownloadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  HardDrive,
  Loader2,
} from "lucide-react";
import { DownloadJob } from "@neurionforge/shared-types";

interface DownloadProgressCardProps {
  job: DownloadJob;
  onCancel: (jobId: string) => void;
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

export function DownloadProgressCard({ job, onCancel }: DownloadProgressCardProps) {
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const isDone = job.status === "done";
  const isCancelled = job.status === "cancelled";
  const isFailed = job.status === "failed";

  return (
    <div className="rounded-2xl bg-[#0f1524] border border-slate-800 p-4 shadow-lg shadow-black/40 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDone
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isFailed || isCancelled
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
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
            <h4 className="text-xs font-bold text-white truncate max-w-md" title={job.filename}>
              {job.filename}
            </h4>
            <p className="text-[11px] text-slate-400 font-mono truncate">{job.repo_id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Status Badge */}
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isDone
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isRunning
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                : isQueued
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : isCancelled
                ? "bg-slate-800 text-slate-400 border border-slate-700"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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

          {(isRunning || isQueued) && (
            <button
              onClick={() => onCancel(job.job_id)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
              title="Cancel Download"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isDone
                ? "bg-emerald-500"
                : isFailed || isCancelled
                ? "bg-rose-500"
                : "bg-gradient-to-r from-cyan-500 to-blue-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, job.percent || 0))}%` }}
          />
        </div>

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span>{job.percent ? `${job.percent.toFixed(1)}%` : "0%"}</span>
            <span>•</span>
            <span>
              {formatBytes(job.bytes_downloaded)} / {formatBytes(job.total_bytes)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isRunning && (
              <>
                <span className="flex items-center gap-1 text-cyan-400">
                  <Zap className="w-3 h-3" />
                  {job.speed_mbps ? `${job.speed_mbps.toFixed(1)} MB/s` : "Calculating..."}
                </span>
                {job.eta_sec && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      ETA {formatEta(job.eta_sec)}
                    </span>
                  </>
                )}
              </>
            )}
            {isDone && <span className="text-emerald-400">Saved to D:/models</span>}
            {isFailed && <span className="text-rose-400 truncate max-w-xs">{job.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
