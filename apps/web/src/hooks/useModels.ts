"use client";

import { useState, useEffect, useCallback } from "react";
import { ModelInfo, SystemStatus } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusAndModels = useCallback(async () => {
    try {
      const [health, modelList] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getModels().catch(() => []),
      ]);

      if (health) {
        setIsServerOnline(true);
        setSystemStatus(health);
      } else {
        setIsServerOnline(false);
        setSystemStatus(null);
      }

      setModels(modelList);
      const loaded = modelList.find((m) => m.loaded);
      setActiveModel(loaded || null);
      setError(null);
    } catch (err: any) {
      setIsServerOnline(false);
      setError(err.message || "Failed to communicate with local server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusAndModels();
    const interval = setInterval(fetchStatusAndModels, 10000);
    return () => clearInterval(interval);
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

  const rescan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.scanModels();
      setModels(list);
      const loaded = list.find((m) => m.loaded);
      setActiveModel(loaded || null);
    } catch (err: any) {
      setError(err.message || "Failed to scan models directory");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    models,
    activeModel,
    systemStatus,
    isServerOnline,
    isLoading,
    loadingModelId,
    deletingModelId,
    error,
    loadModel,
    unloadModel,
    deleteModel,
    rescan,
    refresh: fetchStatusAndModels,
  };
}
