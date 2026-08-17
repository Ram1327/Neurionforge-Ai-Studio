# CURRENT_STATE.md — AI Studio

> Snapshot of what actually exists right now — not what's planned. An agent should
> trust this file over its own assumptions about what's "probably" already built.
> Update this whenever real progress is made; stale entries are worse than none.

**Last updated:** 2026-08-16
**Overall status:** Phase 0 — Not started. Monorepo and codebase do not yet exist.
This file is pre-populated from the implementation plan so the first agent has a
clear starting point.

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
