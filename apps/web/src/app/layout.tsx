import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeurionForge AI Studio | Local AI Inference & Fine-Tuning",
  description: "Run open-weight LLMs locally and fine-tune LoRA adapters with zero cloud dependency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090a0f] text-slate-100 min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
