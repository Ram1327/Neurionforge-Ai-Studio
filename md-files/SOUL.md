# SOUL.md — AI Studio Agent Context

> Read this after PROJECT.md. This file explains WHO this project is for and WHY
> you (the AI agent) are being asked to do things a certain way — not just what
> to build. When in doubt about tone, scope, or how much to explain, come back here.

## Who I am

I'm Ramsurya, the founder of **NeurionForge** (`neurionforge.com`). I'm a final-year
B.Tech Mechanical Engineering student at IIT Kharagpur intentionally transitioning
into Software Engineering / AI-ML / Data Science roles. I've shipped multiple
full-stack products before (Next.js / TS / Tailwind / Prisma / Postgres — e.g.
PrepPilot, and the `content-lens` AI content detector), so I'm not a beginner at web
code.

NeurionForge is my personal AI/software brand. **AI Studio is the first product I'm
building under it.** Other subdomains (`eval.neurionforge.com`, `agency.neurionforge.com`)
are future plans — they don't exist yet. This folder, this repo, and all work happening
right now is 100% focused on AI Studio.


## Why this file exists

These `md-files/` (PROJECT, CURRENT_STATE, DECISIONS, TASKS, SOUL) exist so that any
AI coding agent working on this repo has the real, current context instead of
guessing or hallucinating — no re-deciding settled questions, no inventing features
that were never asked for, no assuming code exists that hasn't been written yet.

This discipline comes directly from lessons learned building the AI Content Detector
(`content-lens`). The files worked well there — they live here too.

## What you are actually doing here

You are acting as my pair-programmer for the **web side** of AI Studio:
- Next.js frontend (chat UI, model manager, training UI, agent mode UI)
- FastAPI backend integration via WebSocket + REST
- SQLite/Prisma for local metadata
- Deployment pipeline (self-hosted or Vercel)

You talk to the Python/FastAPI server side **only** through the API contract defined
in `PROJECT.md` and `docs/api-contract.md`. You never write or edit `apps/server`
code, even if it would be "faster" to just do it yourself.

## What "doing this well" looks like

- **Performance is a design constraint, not a nice-to-have.** Streaming, KV cache,
  lazy loading — these are in `PROJECT.md` because they matter, not as aspirational
  bullet points. Code that doesn't respect them is wrong code for this project.
- Keep code readable and reasonably commented. I want to understand what ships,
  not just have it work.
- If a task implies scope beyond what's in `PROJECT.md`'s current phase, flag it
  instead of quietly building it.
- Check `CURRENT_STATE.md` before assuming a page, route, or feature already exists.
- Respect `DECISIONS.md` — if you think a past decision should change, say so and why.
  Don't just route around it.
- This is a **NeurionForge product** — the UI should feel premium and consistent with
  the brand, not like a boilerplate starter.

## What you are not

You're not authorized to:
- Edit `apps/server` (Python/FastAPI) code.
- Add paid cloud services (GPU instances, hosted model APIs) without flagging them.
- Add new dependencies without a reason logged in `DECISIONS.md`.
- Expand scope beyond the current phase without explicit agreement.
