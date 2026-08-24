"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, WS_BASE } from "@/lib/api";
import type { ConvertJob, ConvertProgressEvent } from "@neurionforge/shared-types";

export type ConvertState = {
  job: ConvertJob | null;
  isConverting: boolean;
  progress: number;
  step: string;
  elapsedSec: number;
  error: string | null;
};

export function useConvert(onDone?: () => void) {
  const [state, setState] = useState<ConvertState>({
    job: null,
    isConverting: false,
    progress: 0,
    step: "",
    elapsedSec: 0,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const connectWs = useCallback((jobId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(`${WS_BASE}/convert/ws/${jobId}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const evt: ConvertProgressEvent = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          progress: evt.progress,
          step: evt.step,
          elapsedSec: evt.elapsed_sec,
          isConverting: evt.status === "running" || evt.status === "queued",
          error: evt.status === "failed" ? evt.step : null,
        }));
        if (evt.status === "done") {
          setState((prev) => ({ ...prev, isConverting: false, progress: 100 }));
          onDone?.();
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, error: "WebSocket connection failed", isConverting: false }));
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, [onDone]);

  const startConversion = useCallback(async (
    modelId: string,
    quantization: "Q4_K_M" | "Q8_0" | "F16",
    adapterId?: string,
  ) => {
    setState({ job: null, isConverting: true, progress: 0, step: "Starting conversion...", elapsedSec: 0, error: null });
    try {
      const resp = await api.startConversion({ model_id: modelId, quantization, adapter_id: adapterId });
      const jobId = resp.job.job_id;
      jobIdRef.current = jobId;
      setState((prev) => ({ ...prev, job: resp.job }));
      connectWs(jobId);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isConverting: false, error: err.message || "Conversion failed" }));
    }
  }, [connectWs]);

  const reset = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    jobIdRef.current = null;
    setState({ job: null, isConverting: false, progress: 0, step: "", elapsedSec: 0, error: null });
  }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return { ...state, startConversion, reset };
}

// ─── PyTorch Download Hook ──────────────────────────────────────────────────

export type PtDownloadState = {
  jobId: string | null;
  isDownloading: boolean;
  percent: number;
  speedMbps: number;
  etaSec: number | null;
  status: string;
  error: string | null;
};

export function usePytorchDownload(onDone?: () => void) {
  const [state, setState] = useState<PtDownloadState>({
    jobId: null,
    isDownloading: false,
    percent: 0,
    speedMbps: 0,
    etaSec: null,
    status: "idle",
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  const startDownload = useCallback(async (repoId: string) => {
    setState({ jobId: null, isDownloading: true, percent: 0, speedMbps: 0, etaSec: null, status: "queued", error: null });
    try {
      const resp = await api.downloadPytorchModel(repoId);
      const jobId = resp.job_id;
      setState((prev) => ({ ...prev, jobId }));

      // Connect WS for progress
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(`${WS_BASE}/convert/pytorch/ws/${jobId}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setState((prev) => ({
            ...prev,
            percent: data.percent ?? prev.percent,
            speedMbps: data.speed_mbps ?? prev.speedMbps,
            etaSec: data.eta_sec ?? prev.etaSec,
            status: data.status ?? prev.status,
            isDownloading: data.status === "running" || data.status === "queued",
            error: data.status === "failed" ? (data.error || "Download failed") : null,
          }));
          if (data.status === "done") {
            setState((prev) => ({ ...prev, isDownloading: false, percent: 100, status: "done" }));
            onDone?.();
          }
        } catch {
          // ignore
        }
      };
      ws.onerror = () => setState((prev) => ({ ...prev, error: "Connection lost", isDownloading: false }));
      ws.onclose = () => { wsRef.current = null; };
    } catch (err: any) {
      setState((prev) => ({ ...prev, isDownloading: false, error: err.message, status: "failed" }));
    }
  }, [onDone]);

  const cancel = useCallback(async () => {
    if (state.jobId) {
      await api.cancelPytorchDownload(state.jobId);
    }
    wsRef.current?.close();
    setState((prev) => ({ ...prev, isDownloading: false, status: "cancelled" }));
  }, [state.jobId]);

  const reset = useCallback(() => {
    wsRef.current?.close();
    setState({ jobId: null, isDownloading: false, percent: 0, speedMbps: 0, etaSec: null, status: "idle", error: null });
  }, []);

  useEffect(() => { return () => { wsRef.current?.close(); }; }, []);

  return { ...state, startDownload, cancel, reset };
}
