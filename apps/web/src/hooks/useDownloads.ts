"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DownloadJob } from "@neurionforge/shared-types";
import { api, WS_BASE } from "@/lib/api";

export function useDownloads(onDownloadCompleted?: () => void) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeWsRef = useRef<WebSocket | null>(null);
  const onCompletedRef = useRef(onDownloadCompleted);
  onCompletedRef.current = onDownloadCompleted;

  const fetchJobs = useCallback(async () => {
    try {
      const allJobs = await api.getDownloads();
      setJobs((prev) => {
        // preserve local dismissed states or combine
        return allJobs;
      });
      const running = allJobs.find((j) => j.status === "running" || j.status === "queued");
      if (running && running.job_id !== activeJobId) {
        setActiveJobId(running.job_id);
      } else if (!running) {
        setActiveJobId(null);
      }
    } catch {
      // ignore
    }
  }, [activeJobId]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Connect WebSocket when an active job is present
  useEffect(() => {
    if (!activeJobId) {
      if (activeWsRef.current) {
        activeWsRef.current.close();
        activeWsRef.current = null;
      }
      return;
    }

    const wsUrl = `${WS_BASE}/downloads/ws/${activeJobId}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      activeWsRef.current = ws;
    } catch {
      return;
    }

    ws.onmessage = (event) => {
      try {
        const update: DownloadJob = JSON.parse(event.data);
        setJobs((prev) => {
          const idx = prev.findIndex((j) => j.job_id === update.job_id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...update };
            return next;
          }
          return [update, ...prev];
        });

        if (update.status === "done") {
          onCompletedRef.current?.();
        }
      } catch {
        // ignore parse error
      }
    };

    ws.onerror = () => {
      // fallback to polling
    };

    ws.onclose = () => {
      // ws closed
    };

    return () => {
      ws.close();
    };
  }, [activeJobId]);

  const startDownload = async (repoId: string, filename: string, rfilename?: string) => {
    setError(null);
    try {
      const res = await api.startDownload(repoId, filename, rfilename);
      setActiveJobId(res.job_id);
      await fetchJobs();
      return res.job_id;
    } catch (err: any) {
      setError(err.message || `Failed to download ${filename}`);
      return null;
    }
  };

  const cancelDownload = async (jobId: string) => {
    try {
      await api.cancelDownload(jobId);
      if (activeJobId === jobId) {
        setActiveJobId(null);
      }
      await fetchJobs();
      return true;
    } catch {
      return false;
    }
  };

  const dismissJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
  };

  return {
    jobs,
    activeJobId,
    error,
    startDownload,
    cancelDownload,
    dismissJob,
    refreshJobs: fetchJobs,
  };
}
