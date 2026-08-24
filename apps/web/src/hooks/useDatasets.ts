"use client";

import { useState, useEffect, useCallback } from "react";
import { Dataset, DatasetValidationResult } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export function useDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = useCallback(async () => {
    try {
      const data = await api.getDatasets();
      setDatasets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load datasets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const validateDataset = async (content: string): Promise<DatasetValidationResult> => {
    try {
      return await api.validateDataset(content);
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || "Validation failed",
        row_count: 0,
        format: "unknown",
      };
    }
  };

  const uploadDataset = async (name: string, content: string): Promise<Dataset | null> => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await api.uploadDataset(name, content);
      await fetchDatasets();
      return res.dataset;
    } catch (err: any) {
      setError(err.message || "Failed to upload dataset");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDataset = async (datasetId: string): Promise<boolean> => {
    setDeletingId(datasetId);
    try {
      await api.deleteDataset(datasetId);
      await fetchDatasets();
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to delete dataset");
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  return {
    datasets,
    isLoading,
    isUploading,
    deletingId,
    error,
    refresh: fetchDatasets,
    validateDataset,
    uploadDataset,
    deleteDataset,
    clearError: () => setError(null),
  };
}
