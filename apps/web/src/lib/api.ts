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

  searchPytorchHub: (q: string = "", limit: number = 20): Promise<HubModelResult[]> =>
    fetchJson<HubModelResult[]>(`/hub/pytorch-search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getPytorchRepoInfo: (repoId: string): Promise<Record<string, unknown>> =>
    fetchJson<Record<string, unknown>>(`/hub/pytorch-info?repo_id=${encodeURIComponent(repoId)}`),


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

  // Datasets (Phase 2)
  getDatasets: (): Promise<import("@neurionforge/shared-types").Dataset[]> =>
    fetchJson<import("@neurionforge/shared-types").Dataset[]>("/datasets"),

  getDataset: (id: string): Promise<import("@neurionforge/shared-types").Dataset> =>
    fetchJson<import("@neurionforge/shared-types").Dataset>(`/datasets/${encodeURIComponent(id)}`),

  uploadDataset: (name: string, content: string): Promise<{ status: string; dataset: import("@neurionforge/shared-types").Dataset }> =>
    fetchJson<{ status: string; dataset: import("@neurionforge/shared-types").Dataset }>("/datasets/upload", {
      method: "POST",
      body: JSON.stringify({ name, content }),
    }),

  validateDataset: (content: string): Promise<import("@neurionforge/shared-types").DatasetValidationResult> =>
    fetchJson<import("@neurionforge/shared-types").DatasetValidationResult>("/datasets/validate", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  deleteDataset: (id: string): Promise<{ id: string; deleted: boolean }> =>
    fetchJson<{ id: string; deleted: boolean }>(`/datasets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Adapters (Phase 2)
  getAdapters: (): Promise<import("@neurionforge/shared-types").AdapterInfo[]> =>
    fetchJson<import("@neurionforge/shared-types").AdapterInfo[]>("/adapters"),

  getAdapter: (id: string): Promise<import("@neurionforge/shared-types").AdapterInfo> =>
    fetchJson<import("@neurionforge/shared-types").AdapterInfo>(`/adapters/${encodeURIComponent(id)}`),

  deleteAdapter: (id: string): Promise<{ id: string; deleted: boolean }> =>
    fetchJson<{ id: string; deleted: boolean }>(`/adapters/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  testAdapterChat: (
    adapterId: string,
    messages: import("@neurionforge/shared-types").ChatMessage[],
    maxTokens: number = 128,
    temperature: number = 0.7
  ): Promise<import("@neurionforge/shared-types").AdapterTestResponse> =>
    fetchJson<import("@neurionforge/shared-types").AdapterTestResponse>(`/adapters/${encodeURIComponent(adapterId)}/test-chat`, {
      method: "POST",
      body: JSON.stringify({ messages, max_tokens: maxTokens, temperature }),
    }),

  // Fine-Tuning Jobs (Phase 2)
  getTrainJobs: (): Promise<import("@neurionforge/shared-types").TrainJob[]> =>
    fetchJson<import("@neurionforge/shared-types").TrainJob[]>("/finetune/jobs"),

  getTrainJob: (jobId: string): Promise<import("@neurionforge/shared-types").TrainJob> =>
    fetchJson<import("@neurionforge/shared-types").TrainJob>(`/finetune/jobs/${encodeURIComponent(jobId)}`),

  startTrainJob: (
    payload: import("@neurionforge/shared-types").TrainRequest
  ): Promise<{ status: string; job: import("@neurionforge/shared-types").TrainJob }> =>
    fetchJson<{ status: string; job: import("@neurionforge/shared-types").TrainJob }>("/finetune/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancelTrainJob: (jobId: string): Promise<{ job_id: string; status: string; message: string }> =>
    fetchJson<{ job_id: string; status: string; message: string }>(`/finetune/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    }),

  deleteTrainJob: (jobId: string): Promise<{ job_id: string; deleted: boolean }> =>
    fetchJson<{ job_id: string; deleted: boolean }>(`/finetune/jobs/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    }),

  // Phase 3: PyTorch Download
  downloadPytorchModel: (repoId: string): Promise<{ job_id: string; status: string; message: string }> =>
    fetchJson<{ job_id: string; status: string; message: string }>("/convert/pytorch/download", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId }),
    }),

  cancelPytorchDownload: (jobId: string): Promise<{ job_id: string; cancelled: boolean }> =>
    fetchJson<{ job_id: string; cancelled: boolean }>(`/convert/pytorch/cancel/${encodeURIComponent(jobId)}`, {
      method: "POST",
    }),

  // Phase 3: GGUF Conversion
  startConversion: (payload: import("@neurionforge/shared-types").ConvertRequest): Promise<{ status: string; job: import("@neurionforge/shared-types").ConvertJob }> =>
    fetchJson<{ status: string; job: import("@neurionforge/shared-types").ConvertJob }>("/convert/to-gguf", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getConvertJob: (jobId: string): Promise<import("@neurionforge/shared-types").ConvertJob> =>
    fetchJson<import("@neurionforge/shared-types").ConvertJob>(`/convert/jobs/${encodeURIComponent(jobId)}`),

  listConvertJobs: (): Promise<import("@neurionforge/shared-types").ConvertJob[]> =>
    fetchJson<import("@neurionforge/shared-types").ConvertJob[]>("/convert/jobs"),
};

