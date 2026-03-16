"""Phase 1: Morris Screening — identify influential parameters.

Usage: python phase1_screening.py <model_name>
Output: <model>/analysis/phase1_results.json, phase1_morris_plot.png
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from SALib.analyze import morris as morris_analyze
from SALib.sample import morris as morris_sample

from common import read_definition, run_sim, load_csv
from evaluators import evaluate

SEEDS = [1, 2, 3]
SCIENCE_DIR = Path(__file__).resolve().parent.parent


def main(model_name: str) -> None:
    defn = read_definition(model_name)
    schema = defn["configSchema"]
    pattern = defn["expectedPattern"]
    default_config = defn["defaultConfig"]

    # Filter to tunable params (not hidden)
    params = [f for f in schema if f.get("tier") != "hidden"]
    param_names = [p["key"] for p in params]
    bounds = [[p["min"], p["max"]] for p in params]

    print("Phase 1: Morris screening on {} params for model '{}'".format(len(param_names), model_name))

    # SALib problem definition
    problem = {
        "num_vars": len(param_names),
        "names": param_names,
        "bounds": bounds,
    }

    # Generate Morris trajectories
    n_trajectories = 100
    samples = morris_sample.sample(problem, N=n_trajectories)
    print("  Generated {} sample points".format(len(samples)))

    # Set up output dirs
    model_dir = SCIENCE_DIR / model_name
    exp_dir = model_dir / "experiments" / "phase1"
    analysis_dir = model_dir / "analysis"
    exp_dir.mkdir(parents=True, exist_ok=True)
    analysis_dir.mkdir(parents=True, exist_ok=True)

    # Run simulations
    scores = []  # type: List[float]
    ticks = pattern["minTicks"]

    for i, sample in enumerate(samples):
        config = dict(default_config)
        for j, name in enumerate(param_names):
            config[name] = float(sample[j])

        # Run replicates with fixed seeds
        replicate_dfs = []
        for seed in SEEDS:
            out_path = exp_dir / "sample-{}-seed-{}.csv".format(i, seed)
            if out_path.exists():
                replicate_dfs.append(load_csv(out_path))
                continue
            try:
                run_sim(model_name, ticks, config, seed, out_path)
                replicate_dfs.append(load_csv(out_path))
            except Exception as e:
                print("  WARN: sample {} seed {} failed: {}".format(i, seed, e))

        if replicate_dfs:
            result = evaluate(replicate_dfs, pattern)
            scores.append(result["score"])
        else:
            scores.append(0.0)

        if (i + 1) % 20 == 0:
            print("  Completed {}/{} samples".format(i + 1, len(samples)))

    # Check failure rate
    fail_count = sum(1 for s in scores if s == 0.0)
    fail_rate = fail_count / len(scores)
    if fail_rate > 0.2:
        print("ERROR: {:.0%} of runs failed (>20% threshold)".format(fail_rate))
        sys.exit(1)

    # Analyze Morris indices
    Y = np.array(scores)
    analysis = morris_analyze.analyze(problem, samples, Y)

    mu_star = analysis["mu_star"]
    sigma = analysis["sigma"]

    # Rank parameters by influence
    ranked = sorted(
        zip(param_names, mu_star, sigma),
        key=lambda x: x[1],
        reverse=True,
    )

    # Save results
    results = {
        "model": model_name,
        "phase": 1,
        "method": "Morris",
        "n_trajectories": n_trajectories,
        "n_replicates": len(SEEDS),
        "total_runs": len(samples) * len(SEEDS),
        "failure_rate": round(fail_rate, 4),
        "ranked_params": [
            {"name": name, "mu_star": round(float(ms), 6), "sigma": round(float(sig), 6)}
            for name, ms, sig in ranked
        ],
        "recommended_top_params": [name for name, _, _ in ranked[:6]],
    }

    results_path = analysis_dir / "phase1_results.json"
    results_path.write_text(json.dumps(results, indent=2))
    print("  Results saved to {}".format(results_path))

    # Plot
    fig, ax = plt.subplots(figsize=(10, 6))
    names_sorted = [r["name"] for r in results["ranked_params"]]
    mu_sorted = [r["mu_star"] for r in results["ranked_params"]]
    sigma_sorted = [r["sigma"] for r in results["ranked_params"]]

    y_pos = np.arange(len(names_sorted))
    ax.barh(y_pos, mu_sorted, xerr=sigma_sorted, align="center", color="#4a90d9", ecolor="#333")
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names_sorted)
    ax.invert_yaxis()
    ax.set_xlabel("mu* (mean absolute elementary effect)")
    ax.set_title("Morris Screening - {}".format(model_name))
    plt.tight_layout()

    plot_path = analysis_dir / "phase1_morris_plot.png"
    fig.savefig(plot_path, dpi=150)
    plt.close(fig)
    print("  Plot saved to {}".format(plot_path))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python phase1_screening.py <model_name>")
        sys.exit(1)
    main(sys.argv[1])
