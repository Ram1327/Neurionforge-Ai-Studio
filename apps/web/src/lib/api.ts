import { ModelInfo, ModelLoadResponse, SystemStatus } from "@neurionforge/shared-types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
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
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return await res.json() as T;
  } catch (err: any) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to NeurionForge Server. Make sure the backend is running on port 8000.");
    }
    throw err;
  }
}

export const api = {
  getHealth: (): Promise<SystemStatus> => fetchJson<SystemStatus>("/health"),
  getModels: (): Promise<ModelInfo[]> => fetchJson<ModelInfo[]>("/models"),
  scanModels: (): Promise<ModelInfo[]> => fetchJson<ModelInfo[]>("/models/scan", { method: "POST" }),
  loadModel: (modelId: string): Promise<ModelLoadResponse> => 
    fetchJson<ModelLoadResponse>(`/models/${encodeURIComponent(modelId)}/load`, { method: "POST" }),
  unloadModel: (modelId?: string): Promise<ModelLoadResponse> => {
    const endpoint = modelId ? `/models/${encodeURIComponent(modelId)}/unload` : "/models/unload";
    return fetchJson<ModelLoadResponse>(endpoint, { method: "POST" });
  },
};
