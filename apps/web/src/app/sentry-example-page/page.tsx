"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const [status, setStatus] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [clientInitialized, setClientInitialized] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(false);

  useEffect(() => {
    const client = Sentry.getClient();
    setClientInitialized(!!client);
  }, []);

  const triggerClientError = () => {
    try {
      throw new Error("Sentry Client-side Test Error (" + new Date().toLocaleTimeString() + ")");
    } catch (error) {
      const id = Sentry.captureException(error);
      setEventId(id || "Sent (check console)");
      setStatus("Client handled exception dispatched to Sentry!");
    }
  };

  const triggerServerError = async () => {
    setLoadingServer(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sentry-example-api");
      const data = await res.json();
      setEventId(data.eventId || "Sent from server");
      setStatus("Server-side error dispatched to Sentry!");
    } catch (e: any) {
      setStatus("Server request failed: " + e.message);
    } finally {
      setLoadingServer(false);
    }
  };

  const triggerUncaughtError = () => {
    throw new Error("Sentry Uncaught Exception Test (" + new Date().toLocaleTimeString() + ")");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto text-2xl font-bold">
          S
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sentry Verification Page</h1>
          <p className="text-sm text-slate-400 mt-2">
            Trigger a test exception to send events directly to your Sentry project.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs py-1 px-3 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 w-fit mx-auto">
          <span className={`w-2 h-2 rounded-full ${clientInitialized ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
          SDK Status: {clientInitialized ? "Active & Connected" : "Initializing..."}
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={triggerServerError}
            disabled={loadingServer}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50"
          >
            {loadingServer ? "Sending Server Error..." : "1. Trigger Server Exception (Fastest)"}
          </button>

          <button
            onClick={triggerClientError}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-900/30"
          >
            2. Trigger Client Exception (captureException)
          </button>

          <button
            onClick={triggerUncaughtError}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all shadow-lg shadow-rose-900/30"
          >
            3. Trigger Uncaught Client Exception
          </button>
        </div>

        {status && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-left space-y-1">
            <div className="font-semibold text-emerald-300">✓ {status}</div>
            {eventId && <div className="text-slate-400 font-mono text-[11px]">Event ID: {eventId}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
