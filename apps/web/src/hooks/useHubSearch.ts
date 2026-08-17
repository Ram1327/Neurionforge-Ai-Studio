"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HubModelResult, GGUFFileInfo } from "@neurionforge/shared-types";
import { api } from "@/lib/api";

export function useHubSearch() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<HubModelResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Files metadata per repo ID
  const [filesByRepo, setFilesByRepo] = useState<Record<string, GGUFFileInfo[]>>({});
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const data = await api.searchHub(searchQuery, 24);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to search HuggingFace Hub");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial trending GGUF models search
  useEffect(() => {
    executeSearch("");
  }, [executeSearch]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newQuery);
    }, 450);
  };

  const fetchRepoFiles = async (repoId: string) => {
    if (filesByRepo[repoId]) {
      setExpandedRepoId(expandedRepoId === repoId ? null : repoId);
      return;
    }

    setLoadingRepoId(repoId);
    setExpandedRepoId(repoId);
    try {
      const files = await api.listHubFiles(repoId);
      setFilesByRepo((prev) => ({ ...prev, [repoId]: files }));
    } catch (err: any) {
      setError(err.message || `Failed to fetch files for ${repoId}`);
    } finally {
      setLoadingRepoId(null);
    }
  };

  return {
    query,
    results,
    isSearching,
    error,
    filesByRepo,
    loadingRepoId,
    expandedRepoId,
    setQuery: handleQueryChange,
    search: executeSearch,
    fetchRepoFiles,
    setExpandedRepoId,
  };
}
