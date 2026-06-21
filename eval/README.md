# GOVWORLD × Arize Phoenix — LLM Observability & Evals

This directory adds **Arize Phoenix** (open-source LLM observability) to GOVWORLD's
adversarial **council debate**: every expert argument is traced, scored by an
LLM-as-judge, and the failure explanations drive a prompt fix that measurably
improves the app — the full *trace → eval → close-the-loop* cycle.

## Result (the headline)

The judge scored council arguments on **evidence_citation** (does the expert cite a
named source?) and **argument_quality** (in-role, on-policy, substantive?). Comparing
a weak prompt (`before`) to the app's evidence-citation mandate (`after`):

| metric | before | after |
|---|---|---|
| evidence_citation | **0%** | **100%** |
| argument_quality  | 50% | 100% |

→ Phoenix surfaced that, without an explicit "cite ≥2 sources by name" instruction,
experts cited **zero** sources. Adding that mandate to `EXPERT_SYSTEM_PROMPTS` /
`generateCouncilArgument` (`src/lib/llm.ts`) took citation to 100%.

## Architecture

GOVWORLD is a browser app; all LLM calls go through `src/lib/llm.ts`.

- **Tracing (TS):** `src/lib/tracing.ts` wraps `generateCouncilArgument` (Gemini) and
  `generateTurnArgument` (Groq) in OpenInference LLM spans and exports OTLP/HTTP to
  `/v1/traces`. The Vite dev server proxies that to Phoenix (`localhost:6006`), so the
  browser stays same-origin (no CORS, no key in the client). Enabled by
  `VITE_PHOENIX_TRACING=true` → `npm run live`.
- **Evals (Python):** `judge.py` pulls the `council_argument` spans from Phoenix,
  scores them with a **Claude** LLM-as-judge, and writes labels + explanations back
  as span annotations.
- **Seeder (Python):** `seed_traces.py` populates Phoenix with deterministic
  `before`/`after` council arguments so the loop is reproducible without the UI.

## Setup

```bash
# from repo root — Python venv already created at eval/.venv
eval/.venv/bin/pip install -r eval/requirements.txt   # if recreating
eval/.venv/bin/phoenix serve                           # → http://localhost:6006
```

Keys are read from the repo `.env`:
- `ANTHROPIC_API_KEY` — the judge (Claude). Falls back to `VITE_GEMINI_API_KEY` if absent.
- `VITE_GEMINI_API_KEY` / `VITE_GROQ_API_KEY` — used by the live app to produce real traces.

## Run the loop

**Option A — reproducible seed (no UI):**
```bash
cd eval
../eval/.venv/bin/python seed_traces.py --variant before
../eval/.venv/bin/python seed_traces.py --variant after
../eval/.venv/bin/python judge.py
```

**Option B — trace the real app:**
```bash
npm run live            # live mode + tracing on (needs real Gemini/Groq keys)
# open http://localhost:5173, run a council debate a few times
cd eval && ../eval/.venv/bin/python judge.py
```

Then open **http://localhost:6006** → Traces view → each council argument now carries
`evidence_citation` and `argument_quality` annotations with written explanations.

## Close the loop

`judge.py` prints the judge's explanations for every failure (e.g. *"makes only general
claims … without citing any named study or report"*). Those explanations are the
coaching signal: they point straight at `EXPERT_SYSTEM_PROMPTS` in `src/lib/llm.ts`.
Tighten the prompt, re-run a debate (or `seed_traces.py --variant after`), re-run
`judge.py`, and watch the pass-rate climb.

## Files
- `seed_traces.py` — emits before/after council-argument spans to Phoenix.
- `judge.py` — Claude LLM-as-judge over council spans; logs annotations + prints the delta.
- `requirements.txt` — pinned Python deps.
- (app side) `src/lib/tracing.ts`, instrumentation in `src/lib/llm.ts`, Vite proxy in `vite.config.ts`, `npm run live`.
