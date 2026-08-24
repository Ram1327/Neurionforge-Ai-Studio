"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { DownloadJob } from "@neurionforge/shared-types";
import { api, WS_BASE } from "@/lib/api";
import { DownloadProgressCard } from "@/components/DownloadProgressCard";

// ─── Context contract ─────────────────────────────────────────────────────────

interface DownloadContextType {
  jobs: DownloadJob[];
  error: string | null;
  startDownload: (
    repoId: string,
    filename: string,
    rfilename?: string
  ) => Promise<string | null>;
  startPytorchDownload: (repoId: string) => Promise<string | null>;
  cancelDownload: (jobId: string) => Promise<boolean>;
  dismissJob: (jobId: string) => void;
  refreshJobs: () => Promise<void>;
  registerOnCompleted: (cb: () => void) => () => void;
}


const DownloadContext = createContext<DownloadContextType | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const activeSocketsRef = useRef<Map<string, WebSocket>>(new Map());
  const dismissedIdsRef = useRef<Set<string>>(dismissedIds);
  dismissedIdsRef.current = dismissedIds;

  const onCompletedListenersRef = useRef<Set<() => void>>(new Set());

  // ── Completion listeners ──────────────────────────────────────────────────

  const registerOnCompleted = useCallback((cb: () => void) => {
    onCompletedListenersRef.current.add(cb);
    return () => {
      onCompletedListenersRef.current.delete(cb);
    };
  }, []);

  const notifyCompleted = useCallback(() => {
    for (const listener of onCompletedListenersRef.current) {
      try {
        listener();
      } catch {
        // ignore
      }
    }
  }, []);

  // ── Job state helpers ────────────────────────────────────────────────────

  const mergeJobUpdate = useCallback((update: Partial<DownloadJob> & { job_id: string }) => {
    if (dismissedIdsRef.current.has(update.job_id)) return;
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.job_id === update.job_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...update };
        return next;
      }
      // New job not yet in state — add it (shouldn't happen often)
      return [update as DownloadJob, ...prev];
    });
  }, []);

  // ── HTTP polling (fallback / initial load) ────────────────────────────────

  const fetchJobs = useCallback(async () => {
    try {
      const allJobs = await api.getDownloads();
      setJobs((prev) => {
        const map = new Map<string, DownloadJob>();
        // Keep existing session jobs that haven't been dismissed
        for (const j of prev) {
          if (!dismissedIdsRef.current.has(j.job_id)) {
            map.set(j.job_id, j);
          }
        }
        // Merge server state — only for jobs that are active or already tracked
        for (const j of allJobs) {
          if (dismissedIdsRef.current.has(j.job_id)) continue;
          if (j.status === "running" || j.status === "queued" || map.has(j.job_id)) {
            map.set(j.job_id, { ...(map.get(j.job_id) || {}), ...j });
          }
        }
        return Array.from(map.values());
      });
    } catch {
      // Swallow — server might be temporarily unreachable
    }
  }, []);

  // Polling with exponential back-off when server is unreachable
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let failures = 0;
    let cancelled = false;

    const NORMAL_MS = 3000;
    const MAX_MS = 30_000;

    const schedule = async () => {
      if (cancelled) return;
      let ok = true;
      try {
        await fetchJobs();
      } catch {
        ok = false;
      }
      if (cancelled) return;
      failures = ok ? 0 : failures + 1;
      const delay = ok
        ? NORMAL_MS
        : Math.min(NORMAL_MS * Math.pow(2, failures - 1), MAX_MS);
      timeoutId = setTimeout(schedule, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fetchJobs]);

  // ── WebSocket manager ────────────────────────────────────────────────────

  const connectWebSocket = useCallback(
    (job: DownloadJob) => {
      if (activeSocketsRef.current.has(job.job_id)) return;

      // ── Correct WS endpoint: pytorch jobs use /convert/pytorch/ws/, GGUF uses /downloads/ws/
      const isPytorchJob = job.job_id.startsWith("pt_");
      const wsUrl = isPytorchJob
        ? `${WS_BASE}/convert/pytorch/ws/${job.job_id}`
        : `${WS_BASE}/downloads/ws/${job.job_id}`;
      let ws: WebSocket;


      try {
        ws = new WebSocket(wsUrl);
      } catch {
        return;
      }

      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let intentionalClose = false;

      const cleanup = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        activeSocketsRef.current.delete(job.job_id);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          // Ignore heartbeat pings
          if (msg.type === "heartbeat") return;

          const update = msg as DownloadJob;
          if (dismissedIdsRef.current.has(update.job_id)) return;

          mergeJobUpdate(update);

          if (update.status === "done") {
            notifyCompleted();
          }

          // Close cleanly on terminal states
          if (["done", "failed", "cancelled"].includes(update.status)) {
            intentionalClose = true;
            ws.close();
          }
        } catch {
          // Malformed message — ignore
        }
      };

      ws.onerror = () => {
        // Logged silently; onclose will handle reconnect
      };

      ws.onclose = () => {
        cleanup();
        if (intentionalClose) return;

        // Reconnect after 2 s if the job is still active
        reconnectTimer = setTimeout(() => {
          setJobs((prev) => {
            const job_ = prev.find((j) => j.job_id === job.job_id);
            if (
              job_ &&
              (job_.status === "running" || job_.status === "queued")
            ) {
              connectWebSocket(job_);
            }
            return prev;
          });
        }, 2000);
      };

      activeSocketsRef.current.set(job.job_id, ws);
    },
    [mergeJobUpdate, notifyCompleted]
  );

  // Sync WebSocket connections to the active jobs list
  useEffect(() => {
    const activeJobs = jobs.filter(
      (j) => j.status === "running" || j.status === "queued"
    );
    const activeIds = new Set(activeJobs.map((j) => j.job_id));

    // Open new sockets for newly active jobs
    for (const job of activeJobs) {
      connectWebSocket(job);
    }

    // Close sockets for jobs that are no longer active
    for (const [id, socket] of activeSocketsRef.current.entries()) {
      if (!activeIds.has(id)) {
        socket.close();
        activeSocketsRef.current.delete(id);
      }
    }
  }, [jobs, connectWebSocket]);

  // Cleanup all sockets on unmount
  useEffect(() => {
    return () => {
      for (const socket of activeSocketsRef.current.values()) {
        socket.close();
      }
      activeSocketsRef.current.clear();
    };
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────

  const startDownload = async (
    repoId: string,
    filename: string,
    rfilename?: string
  ): Promise<string | null> => {
    setError(null);
    try {
      const res = await api.startDownload(repoId, filename, rfilename);

      // Remove from dismissed so it shows up again if re-triggered
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

      setJobs((prev) => [
        initialJob,
        ...prev.filter((j) => j.job_id !== res.job_id),
      ]);

      return res.job_id;
    } catch (err: any) {
      const msg = err.message || `Failed to start download for ${filename}`;
      setError(msg);
      return null;
    }
  };

  const cancelDownload = async (jobId: string): Promise<boolean> => {
    try {
      // PyTorch jobs use a different cancel endpoint
      if (jobId.startsWith("pt_")) {
        await api.cancelPytorchDownload(jobId);
      } else {
        await api.cancelDownload(jobId);
      }

      const socket = activeSocketsRef.current.get(jobId);
      if (socket) {
        socket.close();
        activeSocketsRef.current.delete(jobId);
      }

      setJobs((prev) =>
        prev.map((j) =>
          j.job_id === jobId ? { ...j, status: "cancelled" } : j
        )
      );
      return true;
    } catch {
      return false;
    }
  };

  const startPytorchDownload = async (repoId: string): Promise<string | null> => {
    setError(null);
    try {
      const res = await api.downloadPytorchModel(repoId);
      const jobId = res.job_id;

      // Remove from dismissed so it shows up again if re-triggered
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });

      const folderName = repoId.split("/").pop() ?? repoId;
      const initialJob: DownloadJob = {
        job_id: jobId,
        repo_id: repoId,
        filename: folderName,
        status: "queued",
        bytes_downloaded: 0,
        total_bytes: 0,
        percent: 0,
        speed_mbps: 0,
        eta_sec: null,
      };

      setJobs((prev) => [
        initialJob,
        ...prev.filter((j) => j.job_id !== jobId),
      ]);

      return jobId;
    } catch (err: any) {
      const msg = err.message || `Failed to start PyTorch download for ${repoId}`;
      setError(msg);
      return null;
    }
  };

  const dismissJob = useCallback((jobId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    const socket = activeSocketsRef.current.get(jobId);
    if (socket) {
      socket.close();
      activeSocketsRef.current.delete(jobId);
    }

    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    api.deleteDownloadJob(jobId).catch(() => {});
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DownloadContext.Provider
      value={{
        jobs,
        error,
        startDownload,
        startPytorchDownload,
        cancelDownload,
        dismissJob,
        refreshJobs: fetchJobs,
        registerOnCompleted,
      }}

    >
      {children}

      {/* Global Active Downloads Overlay */}
      {jobs.length > 0 && (
        <div className="fixed bottom-4 left-4 md:left-80 right-4 z-50 space-y-2 pointer-events-auto max-w-xl ml-auto">
          {jobs.slice(0, 3).map((job) => (
            <DownloadProgressCard
              key={job.job_id}
              job={job}
              onCancel={cancelDownload}
              onDismiss={dismissJob}
            />
          ))}
        </div>
      )}
    </DownloadContext.Provider>
  );
}

export function useDownloadContext() {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error(
      "useDownloadContext must be used within a DownloadProvider"
    );
  }
  return context;
}
