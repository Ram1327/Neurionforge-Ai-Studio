"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChatMessage, InferenceRequest, InferenceStats } from "@neurionforge/shared-types";
import { WS_BASE } from "@/lib/api";

export interface UseInferenceStreamOptions {
  onToken?: (token: string) => void;
  onFinish?: (fullText: string, stats?: InferenceStats) => void;
  onError?: (error: string) => void;
}

export function useInferenceStream(options: UseInferenceStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedContent, setStreamedContent] = useState<string>("");
  const [liveStats, setLiveStats] = useState<InferenceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const fullTextRef = useRef<string>("");
  const startTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const tokenCountRef = useRef<number>(0);

  const stopStreaming = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendPrompt = useCallback(
    (request: InferenceRequest) => {
      stopStreaming();
      setError(null);
      setStreamedContent("");
      setLiveStats(null);
      fullTextRef.current = "";
      tokenCountRef.current = 0;
      firstTokenTimeRef.current = 0;
      startTimeRef.current = performance.now();
      setIsStreaming(true);

      const wsUrl = `${WS_BASE}/ws/inference`;
      let ws: WebSocket;

      try {
        ws = new WebSocket(wsUrl);
        socketRef.current = ws;
      } catch (err: any) {
        setIsStreaming(false);
        const errText = `WebSocket connection failed: ${err.message}`;
        setError(errText);
        options.onError?.(errText);
        return;
      }

      ws.onopen = () => {
        ws.send(JSON.stringify(request));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setError(data.error);
            options.onError?.(data.error);
            setIsStreaming(false);
            ws.close();
            return;
          }

          if (data.token) {
            if (tokenCountRef.current === 0) {
              firstTokenTimeRef.current = performance.now();
            }
            tokenCountRef.current += 1;
            fullTextRef.current += data.token;
            setStreamedContent(fullTextRef.current);
            options.onToken?.(data.token);

            // Compute running telemetry
            const now = performance.now();
            const elapsedSinceFirst = (now - firstTokenTimeRef.current) / 1000;
            const currentTps = elapsedSinceFirst > 0 ? tokenCountRef.current / elapsedSinceFirst : 0;
            const currentTtft = firstTokenTimeRef.current - startTimeRef.current;

            setLiveStats({
              tokens_per_sec: parseFloat(currentTps.toFixed(1)),
              ttft_ms: parseFloat(currentTtft.toFixed(1)),
              total_tokens: tokenCountRef.current,
              total_duration_sec: parseFloat(((now - startTimeRef.current) / 1000).toFixed(2)),
            });
          }

          if (data.finished) {
            setIsStreaming(false);
            const finalStats = data.stats || liveStats;
            if (finalStats) {
              setLiveStats(finalStats);
            }
            options.onFinish?.(fullTextRef.current, finalStats);
            ws.close();
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        const msg = "WebSocket encountered a transmission error.";
        setError(msg);
        options.onError?.(msg);
        setIsStreaming(false);
      };

      ws.onclose = () => {
        setIsStreaming(false);
      };
    },
    [options, liveStats, stopStreaming]
  );

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    streamedContent,
    liveStats,
    error,
    sendPrompt,
    stopStreaming,
  };
}
