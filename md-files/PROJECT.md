# PROJECT.md — NeurionForge AI Studio

> This file is shared across the `apps/web/` and `apps/server/` directories of the
> AI Studio sub-product. Any AI agent working in either folder should read this FIRST
> for full project context, even if it only ever touches its own half of the codebase.

## 1. What this project is

**This folder and everything in it is exclusively for AI Studio.**

**AI Studio** (`aistudio.neurionforge.com`) is the **first product** being built under
the [NeurionForge](https://neurionforge.com) brand — a local-first platform for
running open-weight LLMs on your own machine and fine-tuning them (LoRA/QLoRA) on
your own data. Think of it as your own LM Studio + Axolotl, built from scratch.

> **NeurionForge ecosystem note (for context only):**
> Other subdomains (`eval.neurionforge.com`, `agency.neurionforge.com`) are future
> plans — they do not exist yet and are not being built right now. Do not reference,
> scope for, or make decisions in favour of those products. If something isn't AI
> Studio, it doesn't belong in this folder.

AI Studio ships in phases — each phase is a genuinely usable checkpoint:

1. **Phase 0** — Foundations: prove local inference + LoRA training work end-to-end from the CLI before any UI exists.
2. **Phase 1** — Inference Studio: chat with any local GGUF model via a polished web UI (the "LM Studio half").
3. **Phase 2** — Fine-Tuning Studio: upload data, run LoRA/QLoRA training jobs, manage adapters, export merged GGUF (the "Axolotl half").
4. **Phase 3** — Polish / stretch: RAG, quantization pipeline UI, model comparison view, Tauri desktop packaging.
5. **Phase 4** — Agent Platform: minimal local coding agent (chat + agent mode with terminal tool-calling, like opencode/Cursor but running on your own models).

**We are NOT building all phases at once.** Phase 0 ships and is verified before Phase 1 UI starts. Do not add scope to later phases without logging the decision in `DECISIONS.md` first.

## 2. Performance-first principles (apply at every phase)

This is a systems app, not a CRUD app — perceived speed *is* the product. Bake these in from Phase 0:

- **Stream everything.** Tokens, training logs, tool-call output — never make the UI wait for a full response. WebSocket, not polling, everywhere it matters.
- **KV-cache reuse.** Don't re-process the full conversation on every turn — llama.cpp supports prompt caching; reuse the KV cache across turns in the same session.
- **Quantization as default.** Default to 4-bit (Q4_K_M or similar GGUF quant) for both inference and QLoRA training.
- **Async, non-blocking backend.** Model load/unload, training jobs, and terminal tool calls all run as background tasks with progress streamed back — the API layer must never block on a long-running job.
- **Context budget management.** Tool outputs (file contents, terminal stdout) get truncated/summarized before re-entering context — a full file dump blowing up your context window is the #1 thing that makes local-model agents slow and dumb.
- **Lazy model loading + idle unload.** Only load a model into memory when needed; unload after an idle timeout to free VRAM/RAM.
- **Measure it.** Track tokens/sec, time-to-first-token, and training step time in the UI itself from Phase 1 onward.

## 3. Repo structure

```
ai-studio/
├── apps/
│   ├── web/              # Next.js frontend (Ramsurya's domain)
│   │   └── md-files/     # agent context for the web side
│   └── server/           # FastAPI backend (Python)
│       └── md-files/     # agent context for the server side
├── packages/
│   └── shared-types/     # API contract types shared between web and server
├── docs/
│   └── api-contract.md   # canonical REST + WebSocket contract
└── README.md
```

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TS + Tailwind | proven stack from previous NeurionForge projects |
| Backend | FastAPI (Python) | good async/WebSocket support, large ML ecosystem |
| Inference | llama.cpp / llama-cpp-python | fast local inference, GGUF ecosystem, works without a GPU |
| Fine-tuning | transformers + PEFT + bitsandbytes | standard LoRA/QLoRA stack |
| DB | SQLite | zero-setup, fine for local-only metadata (models, jobs, datasets) |
| Storage | Local filesystem | model weights, LoRA checkpoints, uploaded datasets |
| Packaging (later) | Tauri | lighter than Electron for desktop app wrapping |
| Agent tool-calling (Phase 4) | GBNF grammar-constrained decoding via llama.cpp, fallback to prompt-based JSON parsing | forces valid structured output from models without native function-calling |

**No paid third-party AI APIs.** All inference and training runs locally. If this ever
needs to change, it goes in `DECISIONS.md` with a reason.

## 5. API contract (the seam between web and server)

Agreed request/response shapes — **do not change without updating `docs/api-contract.md`
and the `packages/shared-types` package**:

```
// WebSocket: /ws/inference
// Client sends:
{ "model_id": "...", "messages": [...], "temperature": 0.7, "max_tokens": 2048 }

// Server streams back (newline-delimited JSON):
{ "token": "Hello", "finished": false }
{ "token": " world", "finished": false }
{ "token": "", "finished": true, "stats": { "tokens_per_sec": 42.3, "ttft_ms": 210 } }

// REST: GET /models
// Response:
[
  { "id": "mistral-7b-q4", "name": "Mistral 7B Q4_K_M", "size_gb": 4.1, "loaded": false },
  ...
]

// REST: POST /models/{id}/load  |  POST /models/{id}/unload

// REST: POST /jobs/train
// Request:
{ "base_model_id": "...", "dataset_id": "...", "lora_rank": 16, "epochs": 3, "lr": 2e-4 }
// Response: { "job_id": "...", "status": "queued" }

// WebSocket: /ws/jobs/{job_id}/logs
// Streams training logs + loss metrics in real time
```

Full details in `docs/api-contract.md`. When in doubt, that file wins.

## 6. Roadmap (phases — see TASKS.md for the breakdown)

| Phase | Scope |
|---|---|
| 0 | Repo setup, monorepo scaffold, verify llama.cpp inference + LoRA fine-tuning from CLI scripts |
| 1 | Inference Studio — model manager, streaming chat UI, controls |
| 2 | Fine-Tuning Studio — dataset builder, training job runner, adapter management |
| 3 | Polish — RAG, quantization pipeline, model comparison, Tauri packaging |
| 4 | Agent Platform — chat + agent mode, terminal tool-calling, diff review panel |

## 7. Ground rules for any AI agent working on this repo

- Stay inside your own app folder (`apps/web` or `apps/server`). Never edit the other side's code — propose the change in words and let that side's agent/human make it.
- Don't invent features, endpoints, or tech-stack swaps that aren't in this file or `DECISIONS.md`. Flag it and ask rather than assuming.
- Don't introduce a paid service (API, cloud GPU, hosted model) without flagging it — cost is a hard constraint.
- Check `CURRENT_STATE.md` before assuming anything is already built or deployed.
- See `SOUL.md` for who this project is for and why these files exist at all.
