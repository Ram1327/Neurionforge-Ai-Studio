"use client";

import { useState, useEffect, useCallback } from "react";
import { ModelInfo, SystemStatus } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export interface ScanResult {
  success: boolean;
  count: number;
  error?: string;
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusAndModels = useCallback(async () => {
    try {
      const [health, modelList] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getModels().catch(() => null),
      ]);

      if (health) {
        setIsServerOnline(true);
        setSystemStatus(health);
      } else {
        setIsServerOnline(false);
        setSystemStatus(null);
      }

      if (modelList) {
        setModels(modelList);
        const loaded = modelList.find((m) => m.loaded);
        setActiveModel(loaded || null);
      }
      setError(null);
      return !!health; // true = online
    } catch (err: any) {
      setIsServerOnline(false);
      setError(err.message || "Failed to communicate with local server");
      return false; // offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let consecutiveFailures = 0;
    let cancelled = false;

    const NORMAL_INTERVAL = 3500;
    const MAX_INTERVAL = 30000;

    const schedule = async () => {
      if (cancelled) return;
      const online = await fetchStatusAndModels();
      if (cancelled) return;

      if (online) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures += 1;
      }

      // Back-off: 3.5s → 7s → 14s → 30s (capped) when offline
      const nextDelay = online
        ? NORMAL_INTERVAL
        : Math.min(NORMAL_INTERVAL * Math.pow(2, consecutiveFailures - 1), MAX_INTERVAL);
      timeoutId = setTimeout(schedule, nextDelay);
    };

    const onFocus = () => {
      clearTimeout(timeoutId);
      consecutiveFailures = 0;
      schedule();
    };

    schedule();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchStatusAndModels]);

  const loadModel = async (modelId: string) => {
    setLoadingModelId(modelId);
    setError(null);
    try {
      await api.loadModel(modelId);
      await fetchStatusAndModels();
      return true;
    } catch (err: any) {
      setError(err.message || `Failed to load model ${modelId}`);
      return false;
    } finally {
      setLoadingModelId(null);
    }
  };

  const unloadModel = async (modelId?: string) => {
    setError(null);
    try {
      await api.unloadModel(modelId);
      await fetchStatusAndModels();
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to unload model");
      return false;
    }
  };

  const deleteModel = async (modelId: string) => {
    setDeletingModelId(modelId);
    setError(null);
    try {
      await api.deleteModel(modelId);
      await fetchStatusAndModels();
      return true;
    } catch (err: any) {
      setError(err.message || `Failed to delete model ${modelId}`);
      return false;
    } finally {
      setDeletingModelId(null);
    }
  };

  const rescan = async (): Promise<ScanResult> => {
    setIsScanning(true);
    setError(null);
    try {
      const [list, health] = await Promise.all([
        api.scanModels(),
        api.getHealth().catch(() => null),
      ]);
      setModels(list);
      const loaded = list.find((m) => m.loaded);
      setActiveModel(loaded || null);
      setIsServerOnline(true);
      if (health) {
        setSystemStatus(health);
      }
      return { success: true, count: list.length };
    } catch (err: any) {
      const msg = err.message || "Failed to scan models directory";
      setError(msg);
      return { success: false, count: 0, error: msg };
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    models,
    activeModel,
    systemStatus,
    isServerOnline,
    isLoading,
    isScanning,
    loadingModelId,
    deletingModelId,
    error,
    clearError,
    loadModel,
    unloadModel,
    deleteModel,
    rescan,
    refresh: fetchStatusAndModels,
  };
}
