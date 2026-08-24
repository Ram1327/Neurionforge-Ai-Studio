"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrainJob, TrainLogMessage, TrainRequest } from "@neurionforge/shared-types";
import { api, WS_BASE } from "@/lib/api";

export interface LossDataPoint {
  step: number;
  loss: number;
  epoch: number;
}

export function useFineTuneJob(selectedJobId?: string | null) {
  const [jobs, setJobs] = useState<TrainJob[]>([]);
  const [activeJob, setActiveJob] = useState<TrainJob | null>(null);
  const [logs, setLogs] = useState<TrainLogMessage[]>([]);
  const [lossHistory, setLossHistory] = useState<LossDataPoint[]>([]);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.getTrainJobs();
      setJobs(data);
      if (selectedJobId) {
        const found = data.find((j) => j.job_id === selectedJobId);
        if (found) setActiveJob(found);
      } else if (data.length > 0 && !activeJob) {
        // Auto-select latest
        setActiveJob(data[0]);
      }
    } catch (err: any) {
      // Ignore initial load failure if server starting
    }
  }, [selectedJobId, activeJob]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let consecutiveFailures = 0;
    let cancelled = false;

    const NORMAL_INTERVAL = 4000;
    const MAX_INTERVAL = 30000;

    const schedule = async () => {
      if (cancelled) return;
      let online = true;
      try {
        await fetchJobs();
      } catch {
        online = false;
      }
      if (cancelled) return;

      if (online) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures += 1;
      }

      // Back-off: 4s → 8s → 16s → 30s (capped) when offline
      const nextDelay = online
        ? NORMAL_INTERVAL
        : Math.min(NORMAL_INTERVAL * Math.pow(2, consecutiveFailures - 1), MAX_INTERVAL);
      timeoutId = setTimeout(schedule, nextDelay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fetchJobs]);

  // Connect to WebSocket whenever activeJob changes
  useEffect(() => {
    if (!activeJob) {
      setLogs([]);
      setLossHistory([]);
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setLogs([]);
    setLossHistory([]);

    const wsUrl = `${WS_BASE}/finetune/ws/${activeJob.job_id}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg: TrainLogMessage = JSON.parse(event.data);
          setLogs((prev) => [...prev, msg]);

          if (msg.loss !== null && msg.loss !== undefined) {
            setLossHistory((prev) => {
              if (prev.some((p) => p.step === msg.step)) return prev;
              return [...prev, { step: msg.step, loss: msg.loss as number, epoch: msg.epoch }];
            });
          }

          if (msg.status && msg.status !== activeJob.status) {
            setActiveJob((prev) => (prev ? { ...prev, status: msg.status as any } : null));
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        // ws error
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {
      // fail silently
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeJob?.job_id]);

  const startJob = async (req: TrainRequest): Promise<TrainJob | null> => {
    setIsStarting(true);
    setError(null);
    try {
      const res = await api.startTrainJob(req);
      await fetchJobs();
      setActiveJob(res.job);
      return res.job;
    } catch (err: any) {
      const msg: string = err.message || "Failed to launch training job";
      // Check if this is a Phase 3 needs_download 409 — don't set as UI error,
      // let the caller handle it by re-throwing
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.needs_download) {
          setIsStarting(false);
          throw err; // re-throw so handleStartTraining can show the download modal
        }
      } catch (parseErr: any) {
        if (parseErr === err) throw err; // propagate the original error
      }
      setError(msg);
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  const cancelJob = async (jobId: string): Promise<boolean> => {
    setIsCancelling(true);
    try {
      await api.cancelTrainJob(jobId);
      await fetchJobs();
      if (activeJob?.job_id === jobId) {
        setActiveJob((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      }
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to cancel job");
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  const deleteJob = async (jobId: string): Promise<boolean> => {
    try {
      await api.deleteTrainJob(jobId);
      await fetchJobs();
      if (activeJob?.job_id === jobId) {
        setActiveJob(null);
      }
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to delete job");
      return false;
    }
  };

  return {
    jobs,
    activeJob,
    setActiveJob,
    logs,
    lossHistory,
    isStarting,
    isCancelling,
    error,
    startJob,
    cancelJob,
    deleteJob,
    refresh: fetchJobs,
    clearError: () => setError(null),
  };
}
