"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HubModelResult } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export interface PytorchRepoInfo {
  repo_id: string;
  model_name: string;
  author: string;
  size_gb: number | null;
  already_downloaded: boolean;
  dest_path: string;
  pipeline_tag: string;
  tags: string[];
  files: { filename: string; size_bytes: number }[];
}

export function usePytorchHubSearch() {
  const [query, setQueryRaw] = useState<string>("");
  const [results, setResults] = useState<HubModelResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Per-repo info (loaded on expand)
  const [repoInfoByRepo, setRepoInfoByRepo] = useState<Record<string, PytorchRepoInfo>>({});
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const data = await api.searchPytorchHub(searchQuery, 20);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to search PyTorch models on HuggingFace Hub");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial featured PyTorch models
  useEffect(() => {
    executeSearch("");
  }, [executeSearch]);

  const setQuery = (newQuery: string) => {
    setQueryRaw(newQuery);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newQuery);
    }, 500);
  };

  const fetchRepoInfo = async (repoId: string) => {
    // Toggle collapse if already expanded
    if (expandedRepoId === repoId) {
      setExpandedRepoId(null);
      return;
    }

    // Use cached result if available
    if (repoInfoByRepo[repoId]) {
      setExpandedRepoId(repoId);
      return;
    }

    setLoadingRepoId(repoId);
    setExpandedRepoId(repoId);
    try {
      const info = await api.getPytorchRepoInfo(repoId);
      setRepoInfoByRepo((prev) => ({ ...prev, [repoId]: info as unknown as PytorchRepoInfo }));
    } catch (err: any) {
      setError(err.message || `Failed to fetch info for ${repoId}`);
      setExpandedRepoId(null);
    } finally {
      setLoadingRepoId(null);
    }
  };

  /** Invalidate cache for a repo (e.g. after download completes) */
  const invalidateRepo = (repoId: string) => {
    setRepoInfoByRepo((prev) => {
      const next = { ...prev };
      delete next[repoId];
      return next;
    });
  };

  return {
    query,
    results,
    isSearching,
    error,
    repoInfoByRepo,
    loadingRepoId,
    expandedRepoId,
    setQuery,
    search: executeSearch,
    fetchRepoInfo,
    invalidateRepo,
    setExpandedRepoId,
  };
}
