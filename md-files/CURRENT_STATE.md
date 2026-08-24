# CURRENT_STATE.md — AI Studio

> Snapshot of what actually exists right now — not what's planned. An agent should
> trust this file over its own assumptions about what's "probably" already built.
> Update this whenever real progress is made; stale entries are worse than none.

**Last updated:** 2026-08-19
**Overall status:** Phase 1 + Phase 2 complete. Phase 3 partially done (GGUF conversion pipeline built). HuggingFace Hub GGUF download is broken and being redesigned into a unified downloader.

---

## What exists

### Infrastructure
- GitHub repo: https://github.com/Ram1327/Neurionforge-Ai-Studio.git
- Monorepo: `apps/web` (Next.js 15 + TS + Tailwind), `apps/server` (FastAPI + Python)
- `packages/shared-types` — full TypeScript contracts for all API shapes
- `docs/api-contract.md` — REST + WebSocket specification
- Global model weights dir: `D:/models` (configured via `.env` → `MODELS_DIR=D:/models`)
- Vercel production deployment: live, auto-deploys from `main` branch
- FastAPI server runs on `localhost:8000`, started via `apps/server/start.ps1`

### Backend (`apps/server/`)

| File | What it does |
|---|---|
| `main.py` | FastAPI app entry point, registers all routers |
| `db.py` | SQLite schema + queries (models, jobs, datasets, adapters, downloads, convert jobs) |
| `routers/models.py` | `GET /models`, `POST /models/{id}/load`, `POST /models/{id}/unload`, `DELETE /models/{id}`, `POST /models/scan` |
| `routers/inference.py` | `GET /health`, `WS /ws/inference` (streaming token-by-token chat) |
| `routers/hub.py` | `GET /hub/search?q=&limit=` (HF Hub search), `GET /hub/files?repo_id=` (list GGUF files in repo) |
| `routers/downloads.py` | `GET /downloads`, `POST /downloads/start`, `POST /downloads/{id}/cancel`, `DELETE /downloads/{id}`, `WS /downloads/ws/{job_id}` |
| `routers/datasets.py` | `GET /datasets`, `GET /datasets/{id}`, `POST /datasets/upload`, `POST /datasets/validate`, `DELETE /datasets/{id}` |
| `routers/finetune.py` | `GET /finetune/jobs`, `POST /finetune/jobs`, `GET /finetune/jobs/{id}`, `POST /finetune/jobs/{id}/cancel`, `DELETE /finetune/jobs/{id}`, `WS /finetune/ws/{job_id}` |
| `routers/adapters.py` | `GET /adapters`, `GET /adapters/{id}`, `DELETE /adapters/{id}`, `POST /adapters/{id}/test-chat` |
| `routers/convert.py` | `POST /convert/to-gguf`, `GET /convert/jobs`, `GET /convert/jobs/{id}`, `POST /convert/pytorch/download`, `POST /convert/pytorch/cancel/{id}` |
| `services/model_service.py` | Scan `D:/models` for GGUF files, load/unload via llama-cpp-python |
| `services/download_service.py` | Async GGUF download from HuggingFace Hub with progress tracking via WebSocket |
| `services/hub_service.py` | HuggingFace Hub API calls (search repos, list GGUF files in repo) |
| `services/pytorch_download_service.py` | Download PyTorch / HF base model weights (for fine-tuning) |
| `services/finetune_service.py` | LoRA/QLoRA training via transformers + PEFT, background job, WS log streaming |
| `services/adapter_service.py` | List/delete LoRA adapters from `apps/server/adapters/` |
| `services/dataset_service.py` | Upload, validate, store JSONL datasets |
| `services/convert_service.py` | PyTorch → GGUF conversion pipeline (wraps llama.cpp convert script) |

### Frontend (`apps/web/src/`)

#### Pages / Routes
| Route | Feature |
|---|---|
| `/` | Home dashboard (Phase indicator, live server status, quick links) |
| `/chat` | Inference Studio — streaming WebSocket chat with loaded GGUF model |
| `/models` | Model Manager — list local GGUF models, load/unload/delete |
| `/finetune` | Fine-Tuning Studio — datasets, training config, training monitor with loss chart |
| `/adapters` | LoRA Adapter Library — list trained adapters, test-chat, convert to GGUF |
| `/settings` | System & Hardware — server status, model path config |

#### Key Hooks
| Hook | What it does |
|---|---|
| `useModels.ts` | Poll `/health` + `/models` with exponential back-off when server is offline |
| `useDownloads.ts` | Poll `/downloads` with back-off; WebSocket progress per active download job |
| `useFineTuneJob.ts` | Poll `/finetune/jobs` with back-off; WebSocket streaming training logs |
| `useHubSearch.ts` | Search HuggingFace Hub via `/hub/search` |
| `useInferenceStream.ts` | WebSocket streaming chat with `/ws/inference` |
| `useAdapters.ts` | Fetch and manage LoRA adapters |
| `useDatasets.ts` | Upload, validate, list JSONL datasets |
| `useConvert.ts` | Trigger + poll GGUF conversion jobs |

#### Key Components
| Component | Used for |
|---|---|
| `AppShell.tsx` | Sidebar nav, server status badge, model-in-RAM indicator, phase badge |
| `DownloadProgressCard.tsx` | Per-job download progress with speed + ETA |
| `LossChart.tsx` | Real-time training loss curve chart (Recharts) |
| `ContextUsageBar.tsx` | Visual token context usage bar in Inference Studio |

---

## What's deployed / live

- **Vercel Production:** ✅ Auto-deploying from `main`
- **Backend:** runs locally on `localhost:8000` — local-first by design, not server-deployed
- **Subdomain:** `aistudio.neurionforge.com` — ready to map in Vercel

---

## Known-working vs known-broken

| Feature | Status | Notes |
|---|---|---|
| `pnpm install` / `pnpm build` | ✅ Working | |
| FastAPI server startup (`start.ps1`) | ✅ Working | |
| `GET /health` | ✅ Working | |
| `GET /models` (GGUF scan from `D:/models`) | ✅ Working | Subdirectory scan support & automatic folder creation |
| Load / Unload GGUF model | ✅ Working | |
| WebSocket streaming chat (`/ws/inference`) | ✅ Working | |
| HuggingFace Hub search | ✅ Working | |
| Hub GGUF file listing per repo | ✅ Working | |
| **GGUF download from Hub** | ✅ **Fixed 2026-08-19** | Global DownloadContext + Multi-job WS + Safe folder creation |
| **Scan Directory button** | ✅ **Fixed 2026-08-19** | Live scan feedback toast, subfolder scan, health sync |
| Dataset upload + validate | ✅ Working | |
| LoRA fine-tuning job | ✅ Working | CPU-only, small models (1B–3B) |
| Training WebSocket log streaming | ✅ Working | |
| LoRA adapter listing | ✅ Working | |
| Adapter test-chat | ✅ Working | |
| PyTorch → GGUF conversion | ✅ Working | Requires llama.cpp convert script on server |
| **PyTorch download for fine-tuning** | 🔴 **Removed by design** | See DECISIONS.md 2026-08-19 |
| **Auto-download model when starting fine-tune** | 🔴 **Removed by design** | See DECISIONS.md 2026-08-19 |
| Polling back-off (server offline) | ✅ Fixed 2026-08-19 | Was flooding with ERR_CONNECTION_REFUSED |

---

## Known issues — detail

### GGUF Download from Hub — FIXED 2026-08-19
- **Fix applied:** Added global `DownloadContext` with multi-job WebSocket tracking and floating drawer in `AppShell`, added directory creation safeguards (`Path(MODELS_DIR).mkdir(parents=True, exist_ok=True)`), fixed polling state reconciliation, and enhanced scan directory feedback.

### Scan Directory Button — FIXED 2026-08-19
- **Fix applied:** Enhanced `useModels.rescan()` with `isScanning` state, health sync, and explicit scan result feedback toast. Added subfolder recursion so `.gguf` files in 1-level subfolders of `D:/models` are recognized.

### Fine-Tune Base Model Selector — REMOVED auto-download
- **Old behavior:** Showed hardcoded HuggingFace model IDs (Qwen2.5-0.5B, Qwen2.5-1.5B, Llama-3.2-1B) and triggered a background PyTorch download if the model wasn't found locally. Bad UX — silently downloading gigabytes without clear user intent.
- **New behavior:** Only lists PyTorch models already present locally. Empty state: "No PyTorch models — download one from HuggingFace Hub." No auto-download.

---

## Upcoming work

### Priority 1 — Fix GGUF Hub download
Debug the full download chain: `/downloads/start` → background task → WebSocket progress events → frontend progress card.

### Priority 2 — Unified Hub Downloader (see TASKS.md)
Single Hub search/browse page that supports downloading both GGUF and PyTorch models. GGUF → inference; PyTorch → fine-tune base. Explicit user choice, no magic.

### Priority 3 — Model Manager shows PyTorch models
Add a PyTorch/base models section alongside GGUF models. Show model name, size, HF repo, "Use for Fine-Tuning" button.

### Priority 4 — Convert to GGUF UI improvements
- Convert bare PyTorch model to GGUF
- Convert PyTorch + merged LoRA adapter to GGUF
- Both options accessible from Adapter Library and Model Manager

---

## Environment

- [x] GitHub repo connected
- [x] Global model path: `D:/models`
- [x] Python venv: `torch`, `transformers`, `peft`, `llama-cpp-python`, `huggingface_hub`, `bitsandbytes`
- [x] Vercel project connected to repo
- [ ] Custom domain `aistudio.neurionforge.com` mapped in Vercel
- [ ] Backend deployed to persistent server (currently local-only)


---

## What exists

- GitHub repo: https://github.com/Ram1327/Neurionforge-Ai-Studio.git
- Monorepo folder scaffold (`apps/web`, `apps/server`, `packages/shared-types`, `docs/`, `md-files/`)
- Next.js 15 (App Router + TypeScript + Tailwind) in `apps/web` with Vercel build configuration (`vercel.json`)
- `@neurionforge/shared-types` package with complete inference, model, and fine-tuning contracts
- `docs/api-contract.md` — REST and WebSocket specification
- `apps/server/scripts/download_model.py` — GGUF downloader to global `D:/models`
- `apps/server/scripts/test_inference.py` — CLI streaming token inference verified (22.74 tokens/sec on CPU)
- `apps/server/scripts/test_finetune.py` — CLI PEFT LoRA training script with `toy_dataset.jsonl`
- `apps/server/data/toy_dataset.jsonl` — 20 domain-specific training pairs

## What's deployed / live

- **Vercel Production Deployment:** ✅ Live and deploying automatically from `main` on [Ram1327/Neurionforge-Ai-Studio](https://github.com/Ram1327/Neurionforge-Ai-Studio.git).
- **Subdomain:** Ready to map `aistudio.neurionforge.com` in Vercel project domain settings.

## What's in progress right now

- Phase 0 verification and deployment completed. Ready for Phase 1 (Inference Studio — WebSocket streaming chat, model manager UI, and controls).

## Known-working vs known-broken

- `pnpm install` — ✅ working (pnpm v11)
- `pnpm build` — ✅ passing with 0 errors (shared-types typecheck + Next.js 15 build)
- `python scripts/test_inference.py` — ✅ passing (streamed token output on CPU, 22.74 tps)
- Vercel Deployment — ✅ production build completed and outputs deployed

## Environment / accounts set up so far

- [x] GitHub repo created → https://github.com/Ram1327/Neurionforge-Ai-Studio.git
- [x] Global model path configured at `D:/models`
- [x] Python venv and requirements installed (`torch`, `transformers`, `peft`, `llama-cpp-python`)
- [x] Vercel project connected to repository and live
- [ ] Custom domain `aistudio.neurionforge.com` mapped in Vercel

## Notes for the next agent picking this up

- Start with Phase 0: get one small GGUF model chatting via a raw Python script, then
  separately run a LoRA fine-tuning script to completion. **Do not write any API or UI
  code until both of those scripts work end-to-end.**
- The monorepo structure to scaffold: `apps/web/` (Next.js), `apps/server/` (FastAPI),
  `packages/shared-types/`, `docs/`.
- Hardware reality check: LoRA/QLoRA on 1B–3B models at 4-bit is realistic on most
  laptops including CPU-only. Start at that scale before reaching for 7B+ models.
