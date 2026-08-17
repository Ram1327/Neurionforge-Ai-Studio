"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DownloadJob } from "@neurionforge/shared-types";
import { api, WS_BASE } from "@/lib/api";

export function useDownloads(onDownloadCompleted?: () => void) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const activeWsRef = useRef<WebSocket | null>(null);
  const onCompletedRef = useRef(onDownloadCompleted);
  onCompletedRef.current = onDownloadCompleted;
  const dismissedIdsRef = useRef<Set<string>>(dismissedIds);
  dismissedIdsRef.current = dismissedIds;

  const fetchJobs = useCallback(async () => {
    try {
      const allJobs = await api.getDownloads();
      // Only keep running/queued jobs or un-dismissed session jobs
      const relevantJobs = allJobs.filter((j) => {
        if (dismissedIdsRef.current.has(j.job_id)) return false;
        // Keep running or queued
        if (j.status === "running" || j.status === "queued") return true;
        // Don't restore old historical done/failed jobs if not active
        return false;
      });

      setJobs((prev) => {
        // Merge with existing session jobs that might be in auto-dismiss countdown
        const activeMap = new Map<string, DownloadJob>();
        for (const j of prev) {
          if (!dismissedIdsRef.current.has(j.job_id)) {
            activeMap.set(j.job_id, j);
          }
        }
        for (const j of relevantJobs) {
          activeMap.set(j.job_id, { ...activeMap.get(j.job_id), ...j });
        }
        return Array.from(activeMap.values());
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
        if (dismissedIdsRef.current.has(update.job_id)) return;

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

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [activeJobId]);

  const dismissJob = useCallback((jobId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });
    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    // Clean up on server in background
    api.deleteDownloadJob(jobId).catch(() => {});
  }, []);

  const startDownload = async (repoId: string, filename: string, rfilename?: string) => {
    setError(null);
    try {
      const res = await api.startDownload(repoId, filename, rfilename);
      // Remove from dismissed if previously dismissed
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(res.job_id);
        return next;
      });

      const initialJob: DownloadJob = {
        job_id: res.job_id,
        repo_id: repoId,
        filename: filename,
        rfilename: rfilename,
        status: "queued",
        bytes_downloaded: 0,
        total_bytes: 0,
        percent: 0,
        speed_mbps: 0,
        eta_sec: null,
      };

      setJobs((prev) => [initialJob, ...prev.filter((j) => j.job_id !== res.job_id)]);
      setActiveJobId(res.job_id);
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
      // Update local state to cancelled immediately
      setJobs((prev) =>
        prev.map((j) => (j.job_id === jobId ? { ...j, status: "cancelled" } : j))
      );
      return true;
    } catch {
      return false;
    }
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
