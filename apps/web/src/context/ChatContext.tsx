"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ChatMessage, ConversationSession } from "@neurionforge/shared-types";

interface ChatContextType {
  sessions: ConversationSession[];
  activeSessionId: string | null;
  activeSession: ConversationSession | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  createSession: (initialTitle?: string) => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  clearActiveSessionMessages: () => void;
  exportMarkdown: (sessionId?: string) => void;
  exportJson: (sessionId?: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  isHydrated: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SESSIONS_STORAGE_KEY = "neurion_chat_sessions_v2";
const ACTIVE_SESSION_STORAGE_KEY = "neurion_active_session_id_v2";
const LEGACY_STORAGE_KEY = "neurion_chat_messages";
const SIDEBAR_STORAGE_KEY = "neurion_sidebar_open";

function generateSessionId() {
  return "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Initialize from localStorage with fallback migration
  useEffect(() => {
    try {
      // 1. Sidebar open state
      const savedSidebar = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedSidebar !== null) {
        setSidebarOpen(savedSidebar === "true");
      } else {
        setSidebarOpen(window.innerWidth >= 768);
      }

      // 2. Chat sessions
      const savedSessionsRaw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      let parsedSessions: ConversationSession[] = [];

      if (savedSessionsRaw) {
        parsedSessions = JSON.parse(savedSessionsRaw);
      }

      // If no sessions, check if there's legacy messages to migrate
      if (parsedSessions.length === 0) {
        const legacyMessagesRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        let initialMessages: ChatMessage[] = [];
        if (legacyMessagesRaw) {
          try {
            initialMessages = JSON.parse(legacyMessagesRaw);
          } catch {
            // ignore
          }
        }

        const defaultSession: ConversationSession = {
          id: generateSessionId(),
          title: initialMessages.length > 0 && initialMessages[0].role === "user"
            ? initialMessages[0].content.slice(0, 35).trim() + "..."
            : "New Chat",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: initialMessages,
        };
        parsedSessions = [defaultSession];
      }

      setSessions(parsedSessions);

      // 3. Active session ID
      const savedActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (savedActiveId && parsedSessions.some((s) => s.id === savedActiveId)) {
        setActiveSessionId(savedActiveId);
      } else {
        setActiveSessionId(parsedSessions[0]?.id || null);
      }
    } catch (e) {
      console.error("[ChatContext] Failed to load sessions:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist sessions whenever changed
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("[ChatContext] Failed to save sessions:", e);
    }
  }, [sessions, isHydrated]);

  // Persist active session ID whenever changed
  useEffect(() => {
    if (!isHydrated || !activeSessionId) return;
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    } catch (e) {
      console.error("[ChatContext] Failed to save active session ID:", e);
    }
  }, [activeSessionId, isHydrated]);

  // Persist sidebar state
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch {
      // ignore
    }
  }, [sidebarOpen, isHydrated]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  // Update messages of the currently active session
  const setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> = useCallback(
    (action) => {
      setSessions((prevSessions) => {
        if (!activeSessionId) return prevSessions;
        return prevSessions.map((session) => {
          if (session.id !== activeSessionId) return session;

          const newMessages = typeof action === "function" ? action(session.messages) : action;
          
          // Auto title from first user message if still default title
          let newTitle = session.title;
          if (
            (session.title === "New Chat" || session.title === "New Conversation") &&
            newMessages.length > 0
          ) {
            const firstUserMsg = newMessages.find((m) => m.role === "user");
            if (firstUserMsg) {
              const text = firstUserMsg.content.replace(/\n+/g, " ").trim();
              newTitle = text.length > 35 ? text.slice(0, 35).trim() + "..." : text;
            }
          }

          return {
            ...session,
            title: newTitle,
            updated_at: new Date().toISOString(),
            messages: newMessages,
          };
        });
      });
    },
    [activeSessionId]
  );

  const createSession = useCallback((initialTitle = "New Chat") => {
    const newSession: ConversationSession = {
      id: generateSessionId(),
      title: initialTitle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const freshSession: ConversationSession = {
            id: generateSessionId(),
            title: "New Chat",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [],
          };
          setActiveSessionId(freshSession.id);
          return [freshSession];
        }

        if (activeSessionId === id) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeSessionId]
  );

  const renameSession = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim(), updated_at: new Date().toISOString() } : s))
    );
  }, []);

  const clearActiveSessionMessages = useCallback(() => {
    if (!activeSessionId) return;
    setMessages([]);
  }, [activeSessionId, setMessages]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const exportMarkdown = useCallback(
    (sessionId?: string) => {
      const targetSession = sessionId
        ? sessions.find((s) => s.id === sessionId)
        : activeSession;
      if (!targetSession || targetSession.messages.length === 0) return;

      const dateStr = new Date(targetSession.created_at).toLocaleString();
      let md = `# ${targetSession.title}\n\n`;
      md += `*NeurionForge AI Studio — Local Inference Export*\n`;
      md += `*Export Date: ${dateStr}*\n\n---\n\n`;

      targetSession.messages.forEach((msg) => {
        const roleName = msg.role === "user" ? "👤 **User**" : "✨ **Assistant (NeurionForge)**";
        md += `### ${roleName}\n\n`;
        md += `${msg.content}\n\n`;
        if (msg.stats) {
          md += `> *Stats: ${msg.stats.tokens_per_sec} tok/s | ${msg.stats.ttft_ms}ms TTFT | ${msg.stats.total_tokens} tokens | ${msg.stats.total_duration_sec}s*\n\n`;
        }
        md += `---\n\n`;
      });

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${targetSession.title.toLowerCase().replace(/[^a-z0-9]/gi, "_") || "chat"}_export.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [sessions, activeSession]
  );

  const exportJson = useCallback(
    (sessionId?: string) => {
      const targetSession = sessionId
        ? sessions.find((s) => s.id === sessionId)
        : activeSession;
      if (!targetSession) return;

      const jsonStr = JSON.stringify(targetSession, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${targetSession.title.toLowerCase().replace(/[^a-z0-9]/gi, "_") || "chat"}_session.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [sessions, activeSession]
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        activeSession,
        messages,
        setMessages,
        createSession,
        switchSession,
        deleteSession,
        renameSession,
        clearActiveSessionMessages,
        exportMarkdown,
        exportJson,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        isHydrated,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
