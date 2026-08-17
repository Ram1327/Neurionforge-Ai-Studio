# Local AI Studio + Fine-Tuner — Project Plan

## What this is
A local-first app for running open-weight LLMs on your own machine and fine-tuning them (LoRA/QLoRA) on your own data — essentially your own LM Studio + Axolotl, built from scratch as a learning project. Scope is flexible, so the plan below is phased: each phase is a genuinely usable checkpoint, not a dependency you must fully finish before moving on. Final target (post-Phase 3): a minimal opencode/Cursor-agent-style coding assistant running entirely on your own local models — chat mode + agent mode with terminal tool calling.

## Performance-first principles (apply at every phase)
This is a systems app, not a CRUD app — perceived speed *is* the product. Bake these in from Phase 0 rather than retrofitting later:
- **Stream everything.** Tokens, training logs, tool-call output — never make the UI wait for a full response. WebSocket, not polling, everywhere it matters.
- **KV-cache reuse.** Don't re-process the full conversation on every turn — llama.cpp supports prompt caching; reuse the KV cache across turns in the same session instead of re-prefilling from scratch.
- **Quantization as default, not afterthought.** Default to 4-bit (Q4_K_M or similar GGUF quant) for both inference and QLoRA training — pick accuracy trade-ups only when the user explicitly asks for higher fidelity.
- **Async, non-blocking backend.** Model load/unload, training jobs, and terminal tool calls all run as background tasks with progress streamed back — the API layer should never block on a long-running job.
- **Context budget management.** Once agent mode exists (Phase 4), tool outputs (file contents, terminal stdout) get truncated/summarized before re-entering context — a full `ls -R` or file dump blowing up your context window is the #1 thing that makes local-model agents slow and dumb.
- **Lazy model loading + idle unload.** Only load a model into memory when needed; unload after an idle timeout to free VRAM/RAM for whichever tool needs it next (especially once you're juggling a chat model and a tool-calling model).
- **Measure it.** Track tokens/sec, time-to-first-token, and training step time in the UI itself from Phase 1 onward — you can't optimize what you don't display.

---

## Recommended architecture

```
┌─────────────────────────────┐
│  Frontend (Next.js + TS)    │  chat UI, model manager, training UI
│  Tailwind, your usual stack │
└──────────────┬───────────────┘
               │ REST + WebSocket (streaming tokens, training logs)
┌──────────────▼───────────────┐
│  Backend (FastAPI, Python)   │  orchestrates everything below
├───────────────────────────────┤
│  Inference engine             │  llama.cpp (via llama-cpp-python) for
│                                │  GGUF models — fast, low VRAM, CPU fallback
├───────────────────────────────┤
│  Fine-tuning engine            │  HuggingFace transformers + PEFT (LoRA/QLoRA)
│                                │  + bitsandbytes for 4-bit quantized training
├───────────────────────────────┤
│  Storage                      │  SQLite (local metadata: models, jobs, datasets)
│                                │  local filesystem for model weights/checkpoints
└───────────────────────────────┘
```

**Why this split:** inference and fine-tuning have genuinely different engines in the real ecosystem too (llama.cpp for fast quantized inference, transformers/PEFT for training) — trying to force one library to do both is what makes most hobby projects stall. Keep them as two backend modules behind one API from the start.

**Packaging:** run it as `localhost:3000` (frontend) + `localhost:8000` (backend) during dev. Once inference + fine-tuning both work, wrap it in Tauri (lighter than Electron, and you'll actually finish that step instead of abandoning it).

---

## Phase 0 — Foundations (few days)
Goal: prove the core loop works end to end before building any UI.
- Set up the monorepo: `apps/web` (Next.js/TS/Tailwind — you know this), `apps/server` (FastAPI)
- Get `llama-cpp-python` running: download one small GGUF model (e.g. a 1–3B quantized model), get it generating text from a raw Python script — no API yet
- Get PEFT/LoRA fine-tuning running on that same small model against a toy dataset (even 20 hand-written examples) — no API yet, just a training script that completes and saves a LoRA adapter

**Checkpoint:** you can, from the command line, (1) chat with a local model and (2) fine-tune it on a tiny dataset and load the adapter back in. Everything after this is UI and polish.

## Phase 1 — Inference Studio (the "LM Studio" half)
- FastAPI endpoints: list available local models, load/unload a model, stream chat completions over WebSocket (token-by-token, this matters for UX)
- Model manager: browse/download models from HuggingFace Hub (GGUF repos — TheBloke-style quantized models are the easiest entry point), track what's downloaded locally, show size/quant level
- Chat UI: conversation history, system prompt editor, temperature/top-p/max-tokens controls, streaming display
- Basic model params surfaced: context length, GPU offload layers (if you have a GPU), threads (if CPU-only)

**Checkpoint:** a working, usable local chat app — this alone is a legitimate shippable v1 if you wanted to stop here.

## Phase 2 — Fine-Tuning Studio
- Dataset builder/importer: upload a JSONL (instruction/response pairs or chat-format), simple in-UI editor for small datasets, validation (format checking before a job starts)
- Training job config UI: pick base model, LoRA rank/alpha, learning rate, epochs, batch size — with sane presets so you don't need to understand every hyperparameter to start
- Training runner: kick off a job as a background process, stream loss/progress logs to the UI via WebSocket, checkpoint saving
- Adapter management: list trained LoRA adapters, merge-and-test (chat against base model + adapter), export merged model to GGUF for use back in the Inference Studio

**Checkpoint:** the full loop — download a base model, fine-tune it on your own data, chat with the result — inside one app.

## Phase 3 — Polish / stretch (only if time permits, in rough priority order)
- Multi-turn training data from your own chat exports (fine-tune a model on *your* writing style)
- Quantization pipeline (fp16 → GGUF conversion for your merged fine-tunes) built into the UI instead of manual scripts
- RAG: local vector store (e.g. `sqlite-vec` or `chromadb`) + document upload, so chat can reference your own files
- Tauri packaging for a proper installable desktop app
- Model comparison view: same prompt, base vs fine-tuned, side by side

**Checkpoint:** by end of Phase 3 you have a complete, packaged local AI studio — inference, fine-tuning, RAG, comparison — genuinely comparable in scope to LM Studio + a training UI.

## Phase 4 — Agent Platform (the "opencode" half)
This is the big scope addition: turn the studio into a minimal local coding agent, similar to opencode/Cursor's agent mode but running entirely on your own models. Build it deliberately minimal — a small number of reliable tools beats a large number of flaky ones.

**UI shift — two modes, one shared chat interface:**
- **Chat mode:** plain Q&A / coding help, no tool execution, no filesystem or terminal access — this is just Phase 1's chat UI reused
- **Agent mode:** the model can call tools and take actions in a project directory
- Layout matches what you sketched: chat/turn history on the left, a "Review" panel on the right showing the diff of changes made this turn (file writes, shell commands run), model selector dropdown at the bottom (choose from downloaded local models or point at a local model file directly)

**Minimal tool set (resist the urge to add more before these are solid):**
- `read_file(path)` — read a file in the project directory
- `write_file(path, content)` — create/overwrite a file
- `run_command(cmd)` — execute a shell command, capture stdout/stderr, return exit code
- `list_dir(path)` — directory listing
That's it for v1. Search/grep, git diff review, and multi-file edit tools are natural Phase 4.1 additions once these four are reliable.

**Tool calling on local models — the hard part:**
Most small open models don't have native function-calling as clean as GPT/Claude APIs. Two options, in order of recommended path:
1. **Prompt-based structured tool calling** — system prompt instructs the model to emit a fixed JSON schema (`{"tool": "run_command", "args": {...}}`) when it wants to act, backend parses and executes it, feeds the result back as the next turn. Simpler to build, works with any model, but less reliable — needs a parser that tolerates malformed JSON gracefully.
2. **Native function-calling models** — some open models (e.g. certain Qwen/Llama fine-tunes) support real function-calling formats via llama.cpp's grammar-constrained decoding (GBNF), which forces valid JSON output — more reliable, worth adopting once (1) proves the concept.

**Safety/performance guardrails for `run_command` specifically:**
- Whitelist or confirm-before-run for anything destructive (`rm`, `git push`, etc.) — a local agent misfiring on your filesystem is a real risk, not just a UX nuisance
- Sandbox execution to the project directory — no arbitrary path access outside it
- Timeout + output truncation on every command (ties back to the context-budget principle above)
- Show the pending command in the Review panel *before* execution in agent mode, matching the git-repo/"track changes" pattern in your screenshot, so you can see what's about to run

**Checkpoint:** you can open a project folder, ask the agent to make a change, watch it read files, propose an edit, run a command, and show you the diff — powered entirely by a model running on your own machine.

---

## Stack summary

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TS + Tailwind | you already know it cold, no ramp-up cost |
| Backend | FastAPI | matches your ai-content-detector stack, good async/WebSocket support |
| Inference | llama.cpp / llama-cpp-python | fast local inference, GGUF ecosystem, works without a GPU |
| Fine-tuning | transformers + PEFT + bitsandbytes | the standard LoRA/QLoRA stack, huge community docs |
| DB | SQLite | zero-setup, fine for local-only metadata |
| Packaging (later) | Tauri | lighter than Electron |
| Agent tool-calling (Phase 4) | GBNF grammar-constrained decoding via llama.cpp, fallback to prompt-based JSON parsing | forces valid structured output from models without native function-calling |

## Reality check on hardware
LoRA/QLoRA on a small model (1B–3B, 4-bit) is realistic on most laptops, including CPU-only with patience. If you don't have a dedicated GPU, start there rather than reaching for 7B+ models — the plan above is designed to work end-to-end at that scale first, then scale up if your hardware allows.

## Suggested next step
Start Phase 0 today: get one tiny GGUF model chatting via a raw Python script before writing a single line of API or UI code. That's the part most similar projects skip and then get stuck debugging inference *and* API plumbing *and* UI at once.
