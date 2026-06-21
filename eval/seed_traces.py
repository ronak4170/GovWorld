"""
Seed Phoenix with GOVWORLD council-debate argument traces for the eval loop.

Two batches that demonstrate the "close the loop" story:

    python seed_traces.py --variant before   # weak prompt: arguments rarely cite sources
    python seed_traces.py --variant after    # the app's evidence-citation mandate: all cite >=2 sources

The judge (judge.py) then shows the evidence-citation pass-rate jumping from
`before` to `after` -- i.e. Arize surfaced the weakness and the prompt fix
measurably improved the application.

Spans carry the SAME OpenInference attributes the live browser app emits
(openinference.span.kind=LLM, input.value, output.value, llm.model_name,
govworld.surface=council_argument), so judge.py works identically on real app
traces produced by `npm run live`.

Canned arguments are used by default so the demo is deterministic and reserves
the (rate-limited) Gemini quota for the judge. Pass --live to generate fresh
arguments with gemini-2.5-flash instead.
"""

import argparse
import os
import sys
import time

PROJECT = "govworld-council"
ENDPOINT = "http://localhost:6006/v1/traces"

EXPERTS = ["The Economist", "The Community Advocate", "The Corruption Watchdog", "The Civil Engineer"]

# Realistic council arguments. BEFORE: no sources named. AFTER: cites >=2 named sources.
CANNED = {
    "before": {
        "The Economist": "A forty-five million dollar outlay for two-point-three kilometers is steep, and the opportunity cost is real. Frontage businesses will bleed revenue during construction, and some won't survive the disruption. The transit time savings sound nice, but I haven't seen the ridership math hold up. We could be subsidizing a corridor that doesn't pay back for a decade. SEVERITY: 7/10",
        "The Community Advocate": "The people who actually live here are an afterthought. Seniors who can't walk far, families running corner stores, riders who depend on the bus every single morning. They'll eat months of dust and noise and detours. Nobody asked them what they need. This is being done to the neighborhood, not for it. SEVERITY: 8/10",
        "The Corruption Watchdog": "Whenever a project this size moves fast, I get nervous. Change orders pile up, contractors pad invoices, and oversight looks the other way. I want to know who's watching the money here, because history says somebody will try to skim it. Until I see real accountability, assume the worst. SEVERITY: 9/10",
        "The Civil Engineer": "Constructability on Van Ness is harder than the renderings suggest. The soil, the utilities, the staging in a tight corridor. Schedule slips are almost guaranteed once crews break ground. I'd want serious contingency built in before anyone promises eighteen months. SEVERITY: 6/10",
    },
    "after": {
        "The Economist": "The numbers actually pencil out better than critics claim. Per the SFMTA Van Ness BRT Environmental Impact Report, dedicated lanes are projected to cut transit time thirty-two percent across roughly sixteen thousand daily riders. And the INRIX 2024 Urban Mobility Scorecard pegs San Francisco's congestion losses at one-point-eight billion dollars a year, with Van Ness a primary bottleneck. Against that, forty-five million is defensible. SEVERITY: 5/10",
        "The Community Advocate": "I'm not against transit, I'm against ignoring the people in its path. The SF Office of Economic Analysis Complete Streets brief shows frontage revenue dropping eighteen to forty percent during builds before recovering, so merchants need relief now, not platitudes. And the SFMTA EIR's own ridership figures prove who depends on this corridor. Fund mitigation or you'll hollow out the neighborhood you claim to serve. SEVERITY: 7/10",
        "The Corruption Watchdog": "Accountability has to be designed in, not hoped for. The SF Office of Economic Analysis brief flags construction-phase cost volatility as the classic window for overruns, and the SFMTA Van Ness BRT EIR documents how scope changes compound on constrained corridors. I want milestone-gated payments and an independent auditor against those exact baselines. SEVERITY: 8/10",
        "The Civil Engineer": "The engineering risk is real but manageable if we respect the data. The SFMTA Van Ness BRT EIR documents the utility-relocation complexity under this corridor, and the SF Office of Economic Analysis brief shows comparable retrofits routinely slipping schedule. Build the contingency around those findings and eighteen months is plausible. SEVERITY: 6/10",
    },
}


def load_gemini_key() -> str:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    with open(env_path) as fh:
        for line in fh:
            if line.startswith("VITE_GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("No Gemini key found (set GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", choices=["before", "after"], default="after")
    ap.add_argument("--live", action="store_true",
                    help="generate with gemini-2.5-flash instead of canned text (uses quota)")
    ap.add_argument("--sleep", type=float, default=15.0, help="seconds between live calls")
    args = ap.parse_args()

    from phoenix.otel import register
    provider = register(project_name=PROJECT, endpoint=ENDPOINT, auto_instrument=False)
    tracer = provider.get_tracer("govworld-seed")

    model = None
    if args.live:
        key = load_gemini_key()
        import google.generativeai as genai
        genai.configure(api_key=key)
        model = genai.GenerativeModel("gemini-2.5-flash")

    total = 0
    for i, expert in enumerate(EXPERTS):
        if args.live and i > 0:
            time.sleep(args.sleep)
        with tracer.start_as_current_span("council_argument") as span:
            if args.live:
                cite = ("(you MUST cite at least 2 of these facts by source name) "
                        if args.variant == "after" else "")
                prompt = (f"You are {expert} debating the Van Ness Avenue Complete Streets project "
                          f"($45M, 2.3km, BRT lanes). Research available {cite}: SFMTA Van Ness BRT EIR; "
                          f"INRIX 2024 Urban Mobility Scorecard; SF Office of Economic Analysis Complete Streets brief. "
                          f"Give a 120-word in-character argument, then 'SEVERITY: X/10'.")
                try:
                    text = (model.generate_content(prompt).text or "").strip()
                except Exception as e:  # noqa: BLE001
                    text = CANNED[args.variant][expert]
                    print(f"    live failed ({str(e)[:50]}); used canned")
                span.set_attribute("input.value", prompt)
            else:
                text = CANNED[args.variant][expert]
                span.set_attribute("input.value", f"[{args.variant}] council argument for {expert}")

            span.set_attribute("openinference.span.kind", "LLM")
            span.set_attribute("output.value", text)
            span.set_attribute("llm.model_name", "gemini-2.5-flash")
            span.set_attribute("llm.provider", "google")
            span.set_attribute("govworld.surface", "council_argument")
            span.set_attribute("govworld.expert_name", expert)
            span.set_attribute("govworld.batch", args.variant)
            total += 1
            print(f"  [{args.variant}] {expert}: {text[:80]}...")

    time.sleep(3)  # flush BatchSpanProcessor
    print(f"\n✓ Traced {total} council arguments (batch='{args.variant}') to project '{PROJECT}'.")


if __name__ == "__main__":
    main()
