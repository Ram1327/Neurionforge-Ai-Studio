import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ChatProvider } from "@/context/ChatContext";
import { DownloadProvider } from "@/context/DownloadContext";

export const metadata: Metadata = {
  title: "AI Studio — NeurionForge | 100% Local Inference & Fine-Tuning",
  description:
    "Run open-weight LLMs locally via quantized GGUF execution, train custom LoRA/QLoRA adapters on your data, and orchestrate local coding agents. Zero cloud dependencies.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="antialiased bg-[#07090d] text-[#eef2f8] min-h-screen selection:bg-[#4c8dff]/30 selection:text-[#9fe0ff]"
        suppressHydrationWarning
      >
        <DownloadProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
          </ChatProvider>
        </DownloadProvider>
      </body>
    </html>
  );
}
