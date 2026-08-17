# TASKS.md — AI Studio (Web/Frontend)

> Web and frontend tasks only, organized by the phases in PROJECT.md. A phase with
> no web work is left as an empty header on purpose — don't delete it, and don't fill
> it in unless real planning has happened for it.
>
> Server-side tasks (`apps/server`) are tracked separately. The seam between them is
> `docs/api-contract.md` — check it before assuming an endpoint exists.

---

## Phase 0 — Foundations

*Goal: prove local inference + LoRA fine-tuning work from the CLI before any UI is built.*
*The web side has no tasks until both CLI scripts complete successfully.*

- [x] Create GitHub repo for `ai-studio` (`https://github.com/Ram1327/Neurionforge-Ai-Studio.git`)
- [x] Scaffold monorepo: `apps/web/` (Next.js), `apps/server/` (FastAPI), `packages/shared-types/`, `docs/`
- [x] Set up Next.js (App Router + TypeScript + Tailwind) in `apps/web/`
- [x] Define initial shared types in `packages/shared-types/src/index.ts`
- [x] Write `docs/api-contract.md` — REST + WebSocket contract agreed with server side
- [x] Deploy Next.js shell to Vercel (connected to `aistudio.neurionforge.com` pipeline)

**Checkpoint:** CLI inference script and CLI fine-tuning script both work (server side).
Web: blank app deployed at `aistudio.neurionforge.com`.

---

## Phase 1 — Inference Studio

*Goal: a working, usable local chat app — the "LM Studio half".*

### Model Manager
- [ ] `GET /models` — display downloaded models list (id, name, size, quant level, loaded state)
- [ ] Load / Unload controls (`POST /models/{id}/load`, `POST /models/{id}/unload`)
- [ ] Model download UI: search HuggingFace Hub (GGUF repos), trigger download,
      show progress (stream from server)
- [ ] Persist model metadata display (size, quantization, context length, GPU offload layers)

### Chat UI
- [ ] Streaming chat interface — connect to `/ws/inference` WebSocket
- [ ] Token-by-token display with visible cursor (streaming must be obvious to the user)
- [ ] Conversation history per session
- [ ] System prompt editor (collapsible, shown above the conversation)
- [ ] Temperature / top-p / max-tokens controls (with sane defaults)
- [ ] Performance stats visible per response: tokens/sec, time-to-first-token

### Layout / Shell
- [ ] App shell: sidebar (model selector, session list) + main chat area
- [ ] NeurionForge brand header — link back to `neurionforge.com`, subdomain label
- [ ] Responsive layout (desktop-first, but not broken on laptop screens)

**Checkpoint:** chat with any downloaded local model, streaming, with controls — this
alone is a legitimate shippable v1.

---

## Phase 2 — Fine-Tuning Studio

*Goal: the full loop — download, fine-tune, chat with the result — inside one app.*

### Dataset Builder
- [ ] Upload JSONL files (instruction/response pairs or chat format)
- [ ] In-UI editor for small datasets (add/edit/delete rows)
- [ ] Format validation before a training job starts (show errors clearly)
- [ ] Dataset list / management (name, row count, created date)

### Training Job Runner
- [ ] Job config UI: pick base model, LoRA rank/alpha, learning rate, epochs, batch size
- [ ] Presets for common configs (so users don't need to understand every hyperparameter)
- [ ] Kick off training job → `POST /jobs/train`
- [ ] Stream training logs + loss curve to UI via `/ws/jobs/{job_id}/logs`
- [ ] Job list with status (queued / running / complete / failed) and elapsed time

### Adapter Management
- [ ] List trained LoRA adapters (base model, dataset, date, status)
- [ ] "Chat with adapter" — load base + adapter and open a chat session
- [ ] Export merged model to GGUF (trigger server-side merge + conversion, stream progress)

**Checkpoint:** the full fine-tuning loop works end-to-end inside the UI.

---

## Phase 3 — Polish / Stretch

*(Fill in tasks only when this phase is actively being planned.)*

- [ ] RAG: local document upload + vector search (`sqlite-vec` or `chromadb`)
- [ ] Quantization pipeline UI (fp16 → GGUF conversion built into the app, not manual scripts)
- [ ] Model comparison view: same prompt, two models (or base vs fine-tuned), side by side
- [ ] Tauri packaging: wrap `apps/web` + `apps/server` into an installable desktop app
- [ ] Multi-turn training data from chat exports (fine-tune on your own writing style)

---

## Phase 4 — Agent Platform

*(Fill in tasks only when this phase is actively being planned.)*

### Agent Mode UI
- [ ] Two-mode toggle: **Chat mode** (plain Q&A, no tool access) vs **Agent mode**
- [ ] Split layout: chat/turn history (left) + Review panel (right, shows file diffs + commands)
- [ ] Model selector dropdown (choose from downloaded local models)
- [ ] "Pending action" display in Review panel *before* execution — user must confirm
      destructive commands

### Tool Calls (display side)
- [ ] Show tool call name + arguments as a collapsible block in the chat turn
- [ ] Show tool result (truncated if large) inline in the conversation
- [ ] File diff renderer for `write_file` results (like a git diff view)
- [ ] Command output display for `run_command` results

### Safety UI
- [ ] Confirmation modal for any command containing destructive patterns
      (`rm`, `git push`, `drop`, etc.) — block execution until confirmed
- [ ] Project directory selector (agent is sandboxed to this path only)

---

## Ongoing / Cross-phase

- [ ] Error boundaries and loading states on every async action
- [ ] Keep `CURRENT_STATE.md` updated as each phase completes
- [ ] Keep `DECISIONS.md` updated whenever a new technical decision is made
