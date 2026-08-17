import {
  ModelInfo,
  ModelLoadResponse,
  ModelDeleteResponse,
  SystemStatus,
  HubModelResult,
  GGUFFileInfo,
  DownloadJob,
  StartDownloadResponse,
} from "@neurionforge/shared-types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

const FALLBACK_API_BASE = "http://localhost:8000";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const primaryUrl = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(primaryUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        // default message
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    // If primary failed on network error, try localhost fallback
    if (err.name === "TypeError" && (err.message.includes("fetch") || err.message.includes("Failed"))) {
      try {
        const fallbackUrl = `${FALLBACK_API_BASE}${endpoint}`;
        const res = await fetch(fallbackUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options?.headers || {}),
          },
        });
        if (res.ok) {
          return (await res.json()) as T;
        }
      } catch {
        // ignore fallback failure
      }
      throw new Error("Unable to connect to NeurionForge Server. Make sure the backend is running on port 8000.");
    }
    throw err;
  }
}

export const api = {
  // System & Core
  getHealth: (): Promise<SystemStatus> => fetchJson<SystemStatus>("/health"),

  // Local Models
  getModels: (): Promise<ModelInfo[]> => fetchJson<ModelInfo[]>("/models"),
  scanModels: (): Promise<ModelInfo[]> => fetchJson<ModelInfo[]>("/models/scan", { method: "POST" }),
  loadModel: (modelId: string): Promise<ModelLoadResponse> =>
    fetchJson<ModelLoadResponse>(`/models/${encodeURIComponent(modelId)}/load`, { method: "POST" }),
  unloadModel: (modelId?: string): Promise<ModelLoadResponse> => {
    const endpoint = modelId ? `/models/${encodeURIComponent(modelId)}/unload` : "/models/unload";
    return fetchJson<ModelLoadResponse>(endpoint, { method: "POST" });
  },
  deleteModel: (modelId: string): Promise<ModelDeleteResponse> =>
    fetchJson<ModelDeleteResponse>(`/models/${encodeURIComponent(modelId)}`, { method: "DELETE" }),

  // HuggingFace Hub & Downloads (Phase 1.1)
  searchHub: (q: string = "", limit: number = 24): Promise<HubModelResult[]> =>
    fetchJson<HubModelResult[]>(`/hub/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  listHubFiles: (repoId: string): Promise<GGUFFileInfo[]> =>
    fetchJson<GGUFFileInfo[]>(`/hub/files?repo_id=${encodeURIComponent(repoId)}`),

  startDownload: (repoId: string, filename: string, rfilename?: string): Promise<StartDownloadResponse> =>
    fetchJson<StartDownloadResponse>("/downloads/start", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, filename, rfilename }),
    }),

  getDownloads: (): Promise<DownloadJob[]> => fetchJson<DownloadJob[]>("/downloads"),

  cancelDownload: (jobId: string): Promise<{ job_id: string; cancelled: boolean }> =>
    fetchJson<{ job_id: string; cancelled: boolean }>(`/downloads/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    }),

  deleteDownloadJob: (jobId: string): Promise<{ job_id: string; deleted: boolean }> =>
    fetchJson<{ job_id: string; deleted: boolean }>(`/downloads/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    }),
};
