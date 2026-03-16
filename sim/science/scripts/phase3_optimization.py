"""Phase 3: Targeted Optimization — find best parameter combination.

Usage: python phase3_optimization.py <model_name> --phase2-results <path>
Output: <model>/analysis/phase3_results.json, phase3_best_config.json, phase3_convergence_plot.png
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
from scipy.optimize import differential_evolution

from common import read_definition, run_sim, load_csv
from evaluators import evaluate

SEEDS = list(range(1, 11))  # 10 replicates for optimization
SCIENCE_DIR = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 3: Targeted Optimization")
    parser.add_argument("model", help="Model name")
    parser.add_argument("--phase2-results", required=True, help="Path to phase2_results.json")
    args = parser.parse_args()

    model_name = args.model
    phase2 = json.loads(Path(args.phase2_results).read_text())

    defn = read_definition(model_name)
    pattern = defn["expectedPattern"]
    default_config = defn["defaultConfig"]

    param_names = list(phase2["recommended_bounds"].keys())
    bounds_dict = phase2["recommended_bounds"]
    bounds = [tuple(bounds_dict[p]) for p in param_names]

    print("Phase 3: Optimization on {} params for model '{}'".format(len(param_names), model_name))
    print("  Bounds: {}".format(json.dumps(bounds_dict, indent=2)))

    model_dir = SCIENCE_DIR / model_name
    exp_dir = model_dir / "experiments" / "phase3"
    analysis_dir = model_dir / "analysis"
    exp_dir.mkdir(parents=True, exist_ok=True)
    analysis_dir.mkdir(parents=True, exist_ok=True)

    ticks = pattern["minTicks"]
    eval_count = [0]
    convergence_log = []  # type: List[Dict[str, Any]]

    def objective(x):
        """Negative score (minimize) averaged over 10 replicates."""
        config = dict(default_config)
        for j, name in enumerate(param_names):
            config[name] = float(x[j])

        replicate_dfs = []
        for seed in SEEDS:
            out_path = exp_dir / "eval-{}-seed-{}.csv".format(eval_count[0], seed)
            if out_path.exists():
                replicate_dfs.append(load_csv(out_path))
                continue
            try:
                run_sim(model_name, ticks, config, seed, out_path)
                replicate_dfs.append(load_csv(out_path))
            except Exception:
                pass

        if not replicate_dfs:
            eval_count[0] += 1
            return 0.0  # Worst score (minimizing negative, so 0 = worst)

        result = evaluate(replicate_dfs, pattern)
        score = result["score"]
        convergence_log.append({
            "eval": eval_count[0],
            "score": round(score, 4),
            "params": {name: round(float(x[j]), 4) for j, name in enumerate(param_names)},
        })
        eval_count[0] += 1

        if eval_count[0] % 10 == 0:
            print("  Eval {}: score={:.4f}".format(eval_count[0], score))

        return -score  # Minimize negative score

    result = differential_evolution(
        objective,
        bounds=bounds,
        seed=42,
        maxiter=50,
        tol=0.01,
        disp=True,
    )

    best_params = {name: round(float(result.x[j]), 4) for j, name in enumerate(param_names)}
    best_score = round(-result.fun, 4)

    best_config = dict(default_config)
    best_config.update(best_params)

    print("\n  Best score: {}".format(best_score))
    print("  Best params: {}".format(json.dumps(best_params, indent=2)))

    results = {
        "model": model_name,
        "phase": 3,
        "method": "differential_evolution",
        "best_score": best_score,
        "best_params": best_params,
        "total_evaluations": eval_count[0],
        "total_runs": eval_count[0] * len(SEEDS),
        "convergence_log": convergence_log,
        "comparison_with_defaults": {
            name: {
                "default": default_config.get(name),
                "optimized": best_params[name],
                "changed": abs(default_config.get(name, 0) - best_params[name]) > 0.01,
            }
            for name in param_names
        },
    }

    (analysis_dir / "phase3_results.json").write_text(json.dumps(results, indent=2))
    (analysis_dir / "phase3_best_config.json").write_text(json.dumps(best_config, indent=2))

    # Convergence plot
    if convergence_log:
        fig, ax = plt.subplots(figsize=(10, 5))
        evals = [e["eval"] for e in convergence_log]
        scores_hist = [e["score"] for e in convergence_log]
        ax.plot(evals, scores_hist, ".-", alpha=0.5, color="#aaa", markersize=3)

        running_best = []  # type: List[float]
        best_so_far = 0.0
        for s in scores_hist:
            best_so_far = max(best_so_far, s)
            running_best.append(best_so_far)
        ax.plot(evals, running_best, "-", color="#4a90d9", linewidth=2, label="Best so far")

        ax.set_xlabel("Evaluation")
        ax.set_ylabel("Pattern Score")
        ax.set_title("Optimization Convergence - {}".format(model_name))
        ax.legend()
        plt.tight_layout()
        fig.savefig(analysis_dir / "phase3_convergence_plot.png", dpi=150)
        plt.close(fig)

    print("  Phase 3 complete")


if __name__ == "__main__":
    main()
