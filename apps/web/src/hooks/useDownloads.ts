"use client";

import { useEffect, useRef } from "react";
import { useDownloadContext } from "@/context/DownloadContext";

export function useDownloads(onDownloadCompleted?: () => void) {
  const context = useDownloadContext();
  const onCompletedRef = useRef(onDownloadCompleted);
  onCompletedRef.current = onDownloadCompleted;

  useEffect(() => {
    if (!onDownloadCompleted) return;
    const unsubscribe = context.registerOnCompleted(() => {
      onCompletedRef.current?.();
    });
    return unsubscribe;
  }, [context, onDownloadCompleted]);

  return {
    jobs: context.jobs,
    error: context.error,
    startDownload: context.startDownload,
    startPytorchDownload: context.startPytorchDownload,
    cancelDownload: context.cancelDownload,
    dismissJob: context.dismissJob,
    refreshJobs: context.refreshJobs,
  };
}
