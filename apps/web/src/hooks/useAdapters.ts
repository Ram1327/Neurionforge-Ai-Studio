"use client";

import { useState, useEffect, useCallback } from "react";
import { AdapterInfo, ChatMessage, AdapterTestResponse } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export function useAdapters() {
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingAdapterId, setTestingAdapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAdapters = useCallback(async () => {
    try {
      const data = await api.getAdapters();
      setAdapters(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch adapters");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  const deleteAdapter = async (adapterId: string): Promise<boolean> => {
    setDeletingId(adapterId);
    try {
      await api.deleteAdapter(adapterId);
      await fetchAdapters();
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to delete adapter");
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const testAdapter = async (
    adapterId: string,
    messages: ChatMessage[],
    maxTokens: number = 128,
    temperature: number = 0.7
  ): Promise<AdapterTestResponse | null> => {
    setTestingAdapterId(adapterId);
    setError(null);
    try {
      return await api.testAdapterChat(adapterId, messages, maxTokens, temperature);
    } catch (err: any) {
      setError(err.message || `Test chat with adapter ${adapterId} failed`);
      return null;
    } finally {
      setTestingAdapterId(null);
    }
  };

  return {
    adapters,
    isLoading,
    deletingId,
    testingAdapterId,
    error,
    refresh: fetchAdapters,
    deleteAdapter,
    testAdapter,
    clearError: () => setError(null),
  };
}
