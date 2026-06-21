"""
LLM-as-judge for GOVWORLD council-debate arguments, scored in Phoenix.

Pulls every `council_argument` span from the Phoenix project, scores each with a
Claude judge on two criteria, writes the labels + explanations back to Phoenix
(so they show up next to each trace), and prints a before/after summary.

  evidence_citation : does the argument cite >=1 specific named source?  (cited / uncited)
  argument_quality  : in-role, on-policy, substantive?                   (good / poor)

Judge model: Claude (Anthropic) by default — reliable from this network and not
rate-limited. Falls back to gemini-2.5-flash if ANTHROPIC_API_KEY is absent.

Usage:
  ../eval/.venv/bin/python judge.py
"""

import asyncio
import os
import sys

PROJECT = "govworld-council"
PHOENIX_URL = "http://localhost:6006"


def load_env() -> None:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    with open(env_path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()

from phoenix.client import Client  # noqa: E402
from phoenix.evals import LLM, ClassificationEvaluator, async_evaluate_dataframe  # noqa: E402
from phoenix.evals.utils import to_annotation_dataframe  # noqa: E402
from phoenix.trace import suppress_tracing  # noqa: E402


def make_judge() -> LLM:
    if os.environ.get("ANTHROPIC_API_KEY"):
        model = os.environ.get("EVAL_MODEL", "claude-sonnet-4-6")
        print(f"Judge: Anthropic / {model}")
        return LLM(provider="anthropic", model=model)
    # Fallback: Gemini (rate-limited free tier)
    os.environ.setdefault("GOOGLE_API_KEY", os.environ.get("VITE_GEMINI_API_KEY", ""))
    print("Judge: Google / gemini-2.5-flash (Anthropic key not found)")
    return LLM(provider="google", model="gemini-2.5-flash")


def build_evaluators(judge: LLM):
    evidence = ClassificationEvaluator(
        name="evidence_citation",
        llm=judge,
        prompt_template=(
            "You are auditing a policy-debate argument from a city-council expert.\n"
            "Does it cite at least ONE specific external source BY NAME — a named study, "
            "report, agency, dataset, scorecard, or analysis?\n"
            'Generic appeals like "studies show" or "history says" do NOT count.\n\n'
            "Argument:\n{attributes.output.value}\n\n"
            'Answer "cited" or "uncited", then explain in one sentence.'
        ),
        choices={"cited": 1.0, "uncited": 0.0},
    )
    quality = ClassificationEvaluator(
        name="argument_quality",
        llm=judge,
        prompt_template=(
            "You are judging a city-council expert's argument on the Van Ness Avenue "
            "Complete Streets project ($45M road redesign).\n"
            "A GOOD argument stays in the expert's role, directly addresses THIS policy, "
            "and makes a substantive, specific point (not vague filler).\n\n"
            "Argument:\n{attributes.output.value}\n\n"
            'Answer "good" or "poor", then explain in one sentence.'
        ),
        choices={"good": 1.0, "poor": 0.0},
    )
    return [evidence, quality]


def get_scores(df, evaluator_name):
    """Numeric score Series for an evaluator. phoenix-evals writes a `<name>_score`
    column holding {'score','label','explanation'} dicts (or a flat number)."""
    import pandas as pd

    col = f"{evaluator_name}_score"
    if col not in df.columns:
        return None
    s = df[col]
    if s.apply(lambda v: isinstance(v, dict)).any():
        return pd.to_numeric(
            s.apply(lambda v: v.get("score") if isinstance(v, dict) else None),
            errors="coerce",
        )
    return pd.to_numeric(s, errors="coerce")


def get_field(df, evaluator_name, field):
    """Pull 'label' or 'explanation' from the `<name>_score` dict column."""
    col = f"{evaluator_name}_score"
    if col not in df.columns:
        return None
    return df[col].apply(lambda v: v.get(field) if isinstance(v, dict) else None)


async def main() -> None:
    px = Client(base_url=PHOENIX_URL)
    df = px.spans.get_spans_dataframe(project_name=PROJECT)
    df = df[df["name"] == "council_argument"].copy()
    df = df[df["attributes.output.value"].astype(str).str.len() > 20]
    df = df[~df["attributes.output.value"].astype(str).str.startswith("[generation failed")]
    if df.empty:
        sys.exit("No council_argument spans found. Seed (seed_traces.py) or run a live debate first.")

    df["batch"] = df["attributes.govworld"].apply(
        lambda d: d.get("batch") if isinstance(d, dict) else None
    )
    print(f"Scoring {len(df)} council arguments...\n")

    judge = make_judge()
    evaluators = build_evaluators(judge)

    with suppress_tracing():  # don't trace the judge's own calls
        results = await async_evaluate_dataframe(
            dataframe=df, evaluators=evaluators, concurrency=4
        )

    # Write annotations back to Phoenix so they sit next to each trace.
    try:
        with suppress_tracing():
            px.spans.log_span_annotations_dataframe(dataframe=to_annotation_dataframe(results))
        print("✓ Annotations logged to Phoenix.\n")
    except Exception as e:  # noqa: BLE001
        print(f"(annotation logging skipped: {str(e)[:80]})\n")

    # ---- Summary ---------------------------------------------------------
    results = results.copy()
    results["batch"] = df["batch"].values

    print("=" * 64)
    print("RESULTS")
    print("=" * 64)
    score_map = {}
    for ev in evaluators:
        scores = get_scores(results, ev.name)
        if scores is None:
            print(f"  {ev.name}: (no score column found; cols={list(results.columns)})")
            continue
        score_map[ev.name] = scores
        print(f"\n{ev.name}: {scores.mean()*100:.0f}% pass overall")
        for batch in ["before", "after"]:
            mask = results["batch"] == batch
            if mask.any():
                print(f"    {batch:>6}: {scores[mask].mean()*100:.0f}%  (n={int(mask.sum())})")

    # Headline delta for the close-the-loop story
    ev_scores = score_map.get("evidence_citation")
    if ev_scores is not None:
        b = ev_scores[results["batch"] == "before"]
        a = ev_scores[results["batch"] == "after"]
        if len(b) and len(a):
            print("\n" + "-" * 64)
            print(f"CLOSE-THE-LOOP DELTA (evidence_citation): "
                  f"{b.mean()*100:.0f}% → {a.mean()*100:.0f}% "
                  f"(+{(a.mean()-b.mean())*100:.0f} pts)")
            print("-" * 64)

    # A few judge explanations — the "coaching" a coding agent would act on
    labels = get_field(results, "evidence_citation", "label")
    expls = get_field(results, "evidence_citation", "explanation")
    if labels is not None:
        print("\nSample judge explanations (evidence_citation):")
        for i in range(len(results)):
            batch = results["batch"].iloc[i]
            exp = results["attributes.govworld"].iloc[i]
            name = exp.get("expert_name") if isinstance(exp, dict) else "?"
            lbl = labels.iloc[i]
            ex = (expls.iloc[i] or "")[:130] if expls is not None else ""
            print(f"  [{batch:>6}] {name:<24} {lbl:<8} — {ex}")

    print("\nView traces + annotations: http://localhost:6006")


if __name__ == "__main__":
    asyncio.run(main())
