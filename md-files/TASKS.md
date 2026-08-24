# TASKS.md � AI Studio (Web/Frontend)

> Web and frontend tasks only, organized by the phases in PROJECT.md. A phase with
> no web work is left as an empty header on purpose � do not delete it, and do not fill
> it in unless real planning has happened for it.
>
> Server-side tasks (`apps/server`) are tracked separately. The seam between them is
> `docs/api-contract.md` � check it before assuming an endpoint exists.

---

## Phase 0 � Foundations ? COMPLETE

- [x] Create GitHub repo (https://github.com/Ram1327/Neurionforge-Ai-Studio.git)
- [x] Scaffold monorepo: `apps/web/` (Next.js), `apps/server/` (FastAPI), `packages/shared-types/`, `docs/`
- [x] Set up Next.js 15 (App Router + TypeScript + Tailwind) in `apps/web/`
- [x] Define initial shared types in `packages/shared-types/src/index.ts`
- [x] Write `docs/api-contract.md` � REST + WebSocket contract agreed with server side
- [x] Deploy Next.js shell to Vercel (connected to `aistudio.neurionforge.com` pipeline)
- [x] CLI inference script working (22.74 tps on CPU with Qwen2.5-1.5B Q4_K_M)
- [x] CLI fine-tuning script working (PEFT LoRA on toy dataset)

---

## Phase 1 � Inference Studio ? COMPLETE

### Model Manager
- [x] `GET /models` � display downloaded GGUF models (id, name, size, quant, loaded state)
- [x] Load / Unload controls (`POST /models/{id}/load`, `POST /models/{id}/unload`)
- [x] Delete model (`DELETE /models/{id}`)
- [x] Rescan models directory button (`POST /models/scan`)
- [x] Model metadata display (size, quantization, context length)
- [x] HuggingFace Hub search UI (`GET /hub/search`)
- [x] Hub repo file listing (`GET /hub/files?repo_id=`)
- [x] Download GGUF from Hub � progress card with speed + ETA  *(BROKEN � see Phase 2.5)*

### Chat / Inference Studio
- [x] Streaming chat interface via `/ws/inference` WebSocket
- [x] Token-by-token display with streaming cursor
- [x] Conversation history per session
- [x] System prompt editor
- [x] Temperature / top-p / max-tokens controls
- [x] Performance stats per response (tokens/sec, TTFT)
- [x] Context usage bar (visual token budget indicator)

### Layout / Shell
- [x] App shell: sidebar (model selector, nav links) + main content area
- [x] NeurionForge brand header with phase badge
- [x] Server online/offline status badge
- [x] Model-in-RAM indicator in header

---

## Phase 2 � Fine-Tuning Studio ? COMPLETE

### Dataset Builder
- [x] Upload JSONL files (instruction/response or chat format)
- [x] Format validation before training job starts
- [x] Dataset list (name, row count, size, created date)
- [x] Delete dataset

### Training Job Runner
- [x] Job config UI: pick base model, LoRA rank/alpha, learning rate, epochs, batch size
- [x] Training presets: Fast (Rank 4), Balanced (Rank 16), Quality (Rank 32)
- [x] Advanced hyperparameters panel (collapsible)
- [x] Kick off training job via `POST /finetune/jobs`
- [x] Stream training logs + real-time loss curve via `/finetune/ws/{job_id}`
- [x] Job list with status (queued / running / completed / failed / cancelled)
- [x] Cancel job

### Adapter Management
- [x] List trained LoRA adapters (base model, dataset, date, status)
- [x] Test-chat with adapter (`POST /adapters/{id}/test-chat`)
- [x] Convert adapter to GGUF trigger (`POST /convert/to-gguf`)
- [x] Convert job status + progress polling

---

## Phase 2.5 - Bug Fixes & UX (Active)

### GGUF download from Hub & Downloads Visibility — FIXED
- [x] Debug full download chain: /downloads/start backend task WS progress frontend card
- [x] Confirm download_service.py emits correct WebSocket progress events
- [x] Confirm useDownloads.ts & DownloadContext.tsx receive events and map them to job cards
- [x] Global active downloads drawer rendered across all app views (/, /chat, /models, /finetune, etc.)
- [x] Safe folder creation on startup and download initiation (Path(MODELS_DIR).mkdir(parents=True, exist_ok=True))

### Scan Directory Button — FIXED
- [x] useModels.rescan() with isScanning state and toast notification feedback
- [x] Deep scanning: detects .gguf weights in root and 1-level subdirectories of D:/models
- [x] Server status & health synchronized upon rescan
### Remove auto-download from Fine-Tune Studio (decision 2026-08-19)
- [x] Remove hardcoded HuggingFace model ID dropdown from base model selector
- [ ] Replace with dynamic list: scan `D:/models/pytorch/` for locally downloaded model folders
- [ ] Show empty state if no PyTorch models: "No base models � download from HuggingFace Hub"
- [ ] Link empty state to the Hub Downloader page

### Polling flood fix (server offline) � DONE
- [x] `useModels.ts` � exponential back-off (3.5s normal, up to 30s offline)
- [x] `useDownloads.ts` � exponential back-off (3s normal, up to 30s offline)
- [x] `useFineTuneJob.ts` � exponential back-off (4s normal, up to 30s offline)

---

## Phase 3 � Unified Hub Downloader + Model Manager Upgrade (Upcoming)

> Goal: one place to discover and download both GGUF and PyTorch models,
> with explicit user control � no auto-downloads ever.

### HuggingFace Hub Downloader (redesign)
- [ ] Single Hub browse/search page accessible from sidebar
- [ ] Model cards show format tags: GGUF, PyTorch, or both
- [ ] GGUF repos: list individual `.gguf` files with quant label and size � user picks one file
- [ ] PyTorch repos: show "Download for Fine-Tuning" button � downloads full HF model weights
- [ ] Downloads always explicit � never triggered silently in the background
- [ ] Download progress: reuse `DownloadProgressCard` with unified job format
- [ ] GGUF files land in `D:/models/` � appear in Model Manager � immediately usable for inference
- [ ] PyTorch models land in `D:/models/pytorch/{repo_name}/` � appear in Fine-Tune base model selector

### Model Manager � PyTorch Models Section
- [ ] Add second section to Model Manager page: "PyTorch / Base Models"
- [ ] Scan `D:/models/pytorch/` for downloaded HF model folders
- [ ] Show: model name (from HF repo ID), folder size, HF repo link
- [ ] Actions per model: "Use for Fine-Tuning", "Convert to GGUF" (without adapter), "Delete"
- [ ] Keep existing GGUF section unchanged

### Convert to GGUF � Improved UI
- [ ] "Convert to GGUF" accessible from two places:
  - Model Manager (PyTorch section): convert bare PyTorch model to GGUF
  - Adapter Library: merge LoRA adapter into base model, then convert to GGUF
- [ ] Quantization level selector (Q4_K_M default; Q5_K_M, Q8_0, F16 options)
- [ ] Show conversion progress (existing `useConvert.ts` polling)
- [ ] On completion: GGUF auto-appears in Model Manager GGUF section

### API additions required (server side � not frontend work)
- [ ] `GET /models/pytorch` � list PyTorch model folders in `D:/models/pytorch/`
- [ ] Extend `POST /downloads/start` to accept `model_type: "gguf" | "pytorch"` and target path
- [ ] Update `docs/api-contract.md` with these new shapes before implementing

---

## Phase 3 � Polish / Stretch (Later)

- [ ] RAG: local document upload + vector search (`sqlite-vec` or `chromadb`)
- [ ] Model comparison view: same prompt, two models side by side (base vs fine-tuned)
- [ ] Tauri packaging: wrap `apps/web` + `apps/server` into an installable desktop app
- [ ] Multi-turn training data from chat exports (fine-tune on your own writing style)

---

## Phase 4 � Agent Platform

*(Fill in tasks only when this phase is actively being planned.)*

### Agent Mode UI
- [ ] Two-mode toggle: Chat mode vs Agent mode
- [ ] Split layout: chat history (left) + Review panel (right, shows file diffs + commands)
- [ ] Model selector dropdown (choose from downloaded local models)
- [ ] Pending action display in Review panel before execution � user confirms destructive commands

### Tool Calls (display side)
- [ ] Show tool call name + arguments as collapsible block in chat
- [ ] Show tool result (truncated if large) inline in conversation
- [ ] File diff renderer for `write_file` results
- [ ] Command output display for `run_command` results

### Safety UI
- [ ] Confirmation modal for destructive commands (`rm`, `git push`, `drop`, etc.)
- [ ] Project directory selector (agent sandboxed to this path only)

---

## Ongoing / Cross-phase

- [ ] Error boundaries and loading states on every async action
- [x] Keep `CURRENT_STATE.md` updated as each phase completes
- [x] Keep `DECISIONS.md` updated whenever a new technical decision is made
- [x] Polling back-off when server is offline

