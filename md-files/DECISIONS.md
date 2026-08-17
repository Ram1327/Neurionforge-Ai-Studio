# DECISIONS.md — AI Studio

> A running log of decisions and the reasoning behind them, so no one (human or
> agent) re-litigates a settled question or silently reverses it. Append new
> entries at the bottom with a date. Never delete old entries — if a decision is
> reversed, add a new entry saying so and why.

---

### 2026-08-16 — Product placement: AI Studio as a NeurionForge subdomain
**Decision:** AI Studio lives at `aistudio.neurionforge.com`, as a distinct product
under the NeurionForge brand, not as a standalone domain.
**Why:** NeurionForge (`neurionforge.com`) is the brand umbrella. Other products
(`eval.neurionforge.com`, `agency.neurionforge.com`) follow the same pattern. Keeps
portfolio cohesion without locking everything into a single monolithic app.

---

### 2026-08-16 — Phase sequencing: prove the engine before building the UI
**Decision:** Phase 0 must produce two working CLI scripts — one for inference, one
for LoRA fine-tuning — before a single line of API or UI code is written.
**Why:** Most hobby AI projects fail because they debug inference *and* API plumbing
*and* UI all at once. Validate the hardest part (the ML engine) first.

---

### 2026-08-16 — Monorepo structure
**Decision:** One GitHub repo with `apps/web` (Next.js), `apps/server` (FastAPI),
and `packages/shared-types`. `pnpm` for the JS side, standard `venv`/`poetry` for
the Python side.
**Why:** Two distinct runtime environments (TS + Python) but a single source of truth
for the API contract (`packages/shared-types`, `docs/api-contract.md`).

---

### 2026-08-16 — Tech stack: frontend
**Decision:** Next.js + TypeScript + Tailwind (proven NeurionForge stack, reused from
`content-lens` and PrepPilot). No new frontend framework.
**Why:** Zero ramp-up cost. The real difficulty of this project is on the Python/ML
side — the frontend should be familiar ground.

---

### 2026-08-16 — Tech stack: inference engine
**Decision:** `llama-cpp-python` (Python bindings for llama.cpp) for GGUF model
inference.
**Why:** Fast quantized inference, GGUF ecosystem (TheBloke-style models), works
without a dedicated GPU. CPU fallback is important for dev on a laptop.

---

### 2026-08-16 — Tech stack: fine-tuning engine
**Decision:** HuggingFace `transformers` + `peft` (LoRA/QLoRA) + `bitsandbytes` for
4-bit quantized training.
**Why:** The de-facto standard stack for LoRA on consumer hardware. Huge community
docs and examples, well-matched to small-model fine-tuning goals of this project.

---

### 2026-08-16 — Tech stack: database
**Decision:** SQLite for local metadata (models, training jobs, datasets). No hosted
database for AI Studio (unlike `content-lens` which uses Supabase Postgres).
**Why:** AI Studio is a local-first app — it runs on the user's machine. SQLite is
zero-setup, zero-cost, and entirely appropriate for this use case. A hosted DB would
be wrong here.

---

### 2026-08-16 — No paid third-party AI APIs
**Decision:** All inference and fine-tuning runs locally on the user's machine.
No paid detection APIs, no cloud GPU APIs (e.g. Replicate, Together, Modal) unless
explicitly revisited in a future entry here.
**Why:** The whole point of the product is local-first. Calling a cloud API would
undermine the core value proposition, not just add cost.

---

### 2026-08-16 — Streaming via WebSocket, not polling
**Decision:** Token streaming from inference, training logs from fine-tuning jobs —
all go over WebSocket. No polling endpoints for real-time data.
**Why:** Polling adds latency and UI jitter. For a product where perceived speed *is*
the product, WebSocket streaming is non-negotiable.

---

### 2026-08-16 — Packaging: Tauri (deferred to Phase 3+)
**Decision:** Ship as `localhost:3000` + `localhost:8000` during dev and Phase 1–2.
Wrap in Tauri for a proper installable desktop app only at Phase 3 or later.
**Why:** Tauri adds complexity (Rust toolchain, IPC layer). Not worth it until
inference + fine-tuning both work end-to-end. Do not attempt Tauri packaging in
Phases 0–2.

---

### 2026-08-16 — Agent tool-calling: prompt-based first, GBNF second (Phase 4)
**Decision:** For Phase 4 agent mode, start with prompt-based structured tool calling
(system prompt instructs the model to emit a fixed JSON schema). Adopt GBNF
grammar-constrained decoding via llama.cpp only once the prompt-based approach proves
the concept end-to-end.
**Why:** GBNF is more reliable but more complex to set up. Validating the full
agent loop with the simpler approach first avoids over-engineering a feature that
may need significant iteration.

---

### 2026-08-16 — Agent safety: run_command must confirm before destructive ops (Phase 4)
**Decision:** Any `run_command` tool call containing destructive patterns (`rm`, `git push`,
`drop`, etc.) must display the pending command in the Review panel and require user
confirmation before execution. Sandbox to project directory only.
**Why:** A local agent misfiring on your filesystem is a real risk. This is a hard
safety requirement, not a UX nicety — do not ship agent mode without it.

---

### 2026-08-16 — Model weights directory: global D:/models
**Decision:** All local GGUF and base model weights will reside in a global directory `D:/models`, configured via `MODELS_DIR=D:/models` in `.env`.
**Why:** Avoids duplicating multi-gigabyte model weights across different folders or subprojects, saves disk space, and allows shared access across inference, training, and local scripts.

---

### 2026-08-16 — Phase 0 baseline model: Qwen2.5-1.5B
**Decision:** Standardize Phase 0 verification on `Qwen2.5-1.5B-Instruct` (Q4_K_M GGUF for inference, HF base for PEFT LoRA training).
**Why:** Optimal sweet spot (~1.1 GB disk, ~1.2 GB RAM) for fast CPU execution and low-resource fine-tuning verification before scaling up to larger models.

