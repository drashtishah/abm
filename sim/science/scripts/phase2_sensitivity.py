"""Phase 2: Sobol Sensitivity Analysis — quantify parameter effects and interactions.

Usage: python phase2_sensitivity.py <model_name> --params param1,param2,...
Output: <model>/analysis/phase2_results.json, phase2_sobol_plot.png, phase2_heatmap.png
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from SALib.analyze import sobol as sobol_analyze
from SALib.sample import sobol as sobol_sample

from common import read_definition, run_sim, load_csv
from evaluators import evaluate

SEEDS = [1, 2, 3]
SCIENCE_DIR = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 2: Sobol Sensitivity Analysis")
    parser.add_argument("model", help="Model name")
    parser.add_argument("--params", required=True, help="Comma-separated param names from Phase 1")
    parser.add_argument("--n-samples", type=int, default=512, help="Sobol sample count N")
    args = parser.parse_args()

    model_name = args.model
    param_names = [p.strip() for p in args.params.split(",")]

    defn = read_definition(model_name)
    schema_map = {f["key"]: f for f in defn["configSchema"]}
    pattern = defn["expectedPattern"]
    default_config = defn["defaultConfig"]

    bounds = [[schema_map[p]["min"], schema_map[p]["max"]] for p in param_names]

    print("Phase 2: Sobol analysis on {} params for model '{}'".format(len(param_names), model_name))

    problem = {
        "num_vars": len(param_names),
        "names": param_names,
        "bounds": bounds,
    }

    samples = sobol_sample.sample(problem, args.n_samples)
    print("  Generated {} sample points".format(len(samples)))

    model_dir = SCIENCE_DIR / model_name
    exp_dir = model_dir / "experiments" / "phase2"
    analysis_dir = model_dir / "analysis"
    exp_dir.mkdir(parents=True, exist_ok=True)
    analysis_dir.mkdir(parents=True, exist_ok=True)

    scores = []  # type: List[float]
    ticks = pattern["minTicks"]

    for i, sample in enumerate(samples):
        config = dict(default_config)
        for j, name in enumerate(param_names):
            config[name] = float(sample[j])

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

        if (i + 1) % 100 == 0:
            print("  Completed {}/{} samples".format(i + 1, len(samples)))

    fail_count = sum(1 for s in scores if s == 0.0)
    fail_rate = fail_count / len(scores)
    if fail_rate > 0.2:
        print("ERROR: {:.0%} of runs failed (>20% threshold)".format(fail_rate))
        sys.exit(1)

    Y = np.array(scores)
    analysis = sobol_analyze.analyze(problem, Y)

    s1 = analysis["S1"]
    st = analysis["ST"]
    s2 = analysis.get("S2", np.zeros((len(param_names), len(param_names))))

    # Recommend bounds: narrow to regions where score > median
    median_score = float(np.median(scores))
    recommended_bounds = {}  # type: Dict[str, List[float]]
    for j, name in enumerate(param_names):
        good_values = [float(samples[i][j]) for i in range(len(samples)) if scores[i] > median_score]
        if good_values:
            recommended_bounds[name] = [
                round(float(np.percentile(good_values, 10)), 6),
                round(float(np.percentile(good_values, 90)), 6),
            ]
        else:
            recommended_bounds[name] = bounds[j]

    results = {
        "model": model_name,
        "phase": 2,
        "method": "Sobol",
        "n_samples": args.n_samples,
        "total_sample_points": len(samples),
        "n_replicates": len(SEEDS),
        "total_runs": len(samples) * len(SEEDS),
        "failure_rate": round(fail_rate, 4),
        "indices": {
            name: {
                "S1": round(float(s1[j]), 6),
                "ST": round(float(st[j]), 6),
            }
            for j, name in enumerate(param_names)
        },
        "interactions": {
            "{}-{}".format(param_names[i], param_names[j]): round(float(s2[i][j]), 6)
            for i in range(len(param_names))
            for j in range(i + 1, len(param_names))
        },
        "recommended_bounds": recommended_bounds,
    }

    results_path = analysis_dir / "phase2_results.json"
    results_path.write_text(json.dumps(results, indent=2))
    print("  Results saved to {}".format(results_path))

    # Sobol bar chart
    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(param_names))
    width = 0.35
    ax.bar(x - width / 2, s1, width, label="First-order (S1)", color="#4a90d9")
    ax.bar(x + width / 2, st, width, label="Total-order (ST)", color="#d94a4a")
    ax.set_xticks(x)
    ax.set_xticklabels(param_names, rotation=45, ha="right")
    ax.set_ylabel("Sensitivity Index")
    ax.set_title("Sobol Sensitivity - {}".format(model_name))
    ax.legend()
    plt.tight_layout()
    plot_path = analysis_dir / "phase2_sobol_plot.png"
    fig.savefig(plot_path, dpi=150)
    plt.close(fig)

    # Interaction heatmap
    if len(param_names) > 1:
        fig, ax = plt.subplots(figsize=(8, 8))
        s2_matrix = np.array(s2)
        im = ax.imshow(s2_matrix, cmap="YlOrRd", aspect="auto")
        ax.set_xticks(range(len(param_names)))
        ax.set_yticks(range(len(param_names)))
        ax.set_xticklabels(param_names, rotation=45, ha="right")
        ax.set_yticklabels(param_names)
        ax.set_title("Parameter Interactions (S2) - {}".format(model_name))
        fig.colorbar(im)
        plt.tight_layout()
        heatmap_path = analysis_dir / "phase2_heatmap.png"
        fig.savefig(heatmap_path, dpi=150)
        plt.close(fig)

    print("  Phase 2 complete")


if __name__ == "__main__":
    main()
