"""Pattern evaluators for ABM simulation output.

Each evaluator takes a list of DataFrames (replicates) and criteria dict,
returns {score: float 0-1, passed: bool, details: dict}.
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy.signal import find_peaks


def evaluate_oscillation(
    dfs: List[pd.DataFrame],
    criteria: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate oscillation pattern (e.g., Lotka-Volterra cycles).

    Scores based on: cycle count, population survival, amplitude consistency.
    """
    min_cycles = criteria["minCycles"]
    max_extinction = criteria["maxExtinctionRate"]
    populations = criteria["populations"]
    min_ticks = criteria["minTicks"]

    replicate_scores = []  # type: List[float]
    total_extinctions = 0

    for df in dfs:
        if len(df) < min_ticks:
            replicate_scores.append(0.0)
            continue

        cycle_counts = []  # type: List[int]
        pop_extinct = False

        for pop in populations:
            series = df[pop].values.astype(float)

            # Check extinction
            if np.any(series == 0):
                pop_extinct = True

            # Count peaks (cycles) using smoothed signal
            if len(series) > 10:
                kernel = np.ones(5) / 5
                smoothed = np.convolve(series, kernel, mode="valid")
            else:
                smoothed = series

            # Require peaks to have meaningful prominence relative to raw signal range
            raw_range = float(np.ptp(series))
            min_prominence = max(raw_range * 0.1, 1.0)
            peaks, _ = find_peaks(smoothed, distance=20, prominence=min_prominence)
            cycle_counts.append(len(peaks))

        if pop_extinct:
            total_extinctions += 1

        avg_cycles = float(np.mean(cycle_counts)) if cycle_counts else 0
        cycle_score = min(1.0, avg_cycles / min_cycles)
        survival_score = 0.5 if pop_extinct else 1.0
        replicate_scores.append(cycle_score * 0.7 + survival_score * 0.3)

    avg_score = float(np.mean(replicate_scores)) if replicate_scores else 0.0
    extinction_rate = total_extinctions / len(dfs) if dfs else 1.0

    if extinction_rate > max_extinction:
        avg_score *= 0.5

    passed = (
        avg_score > 0.5
        and extinction_rate <= max_extinction
        and all(s > 0 for s in replicate_scores)
    )

    return {
        "score": round(avg_score, 4),
        "passed": passed,
        "details": {
            "extinction_rate": round(extinction_rate, 4),
            "replicate_scores": [round(s, 4) for s in replicate_scores],
            "avg_cycles": float(np.mean([
                len(find_peaks(
                    np.convolve(df[populations[0]].values.astype(float), np.ones(5) / 5, mode="valid"),
                    distance=20,
                    prominence=max(float(np.ptp(df[populations[0]].values.astype(float))) * 0.1, 1.0),
                )[0])
                for df in dfs
            ])) if dfs and populations else 0,
        },
    }


def evaluate_equilibrium(
    dfs: List[pd.DataFrame],
    criteria: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate equilibrium pattern (converge to steady state)."""
    stabilize_by = criteria["stabilizeByTick"]
    max_variance = criteria["maxVariance"]
    populations = criteria["populations"]
    min_ticks = criteria["minTicks"]

    replicate_scores = []  # type: List[float]

    for df in dfs:
        if len(df) < min_ticks:
            replicate_scores.append(0.0)
            continue

        pop_scores = []  # type: List[float]
        for pop in populations:
            series = df[pop].values.astype(float)
            tail = series[stabilize_by:]
            if len(tail) == 0:
                pop_scores.append(0.0)
                continue
            variance = float(np.var(tail))
            if variance <= max_variance:
                pop_scores.append(1.0)
            else:
                pop_scores.append(max_variance / variance)

        replicate_scores.append(float(np.mean(pop_scores)) if pop_scores else 0.0)

    avg_score = float(np.mean(replicate_scores)) if replicate_scores else 0.0
    passed = avg_score > 0.7

    return {
        "score": round(avg_score, 4),
        "passed": passed,
        "details": {
            "replicate_scores": [round(s, 4) for s in replicate_scores],
        },
    }


def evaluate_epidemic_curve(
    dfs: List[pd.DataFrame],
    criteria: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate epidemic curve pattern (single peak then decline)."""
    peak_within = criteria["peakWithinTicks"]
    must_decline = criteria["mustDecline"]
    populations = criteria["populations"]
    min_ticks = criteria["minTicks"]

    replicate_scores = []  # type: List[float]

    for df in dfs:
        if len(df) < min_ticks:
            replicate_scores.append(0.0)
            continue

        pop_scores = []  # type: List[float]
        for pop in populations:
            series = df[pop].values.astype(float)
            peak_idx = int(np.argmax(series))
            score = 1.0

            # Penalize if peak is too late
            if peak_idx > peak_within:
                score *= peak_within / peak_idx

            # Check that series declines after peak
            if must_decline and peak_idx < len(series) - 10:
                post_peak = series[peak_idx:]
                if post_peak[-1] >= post_peak[0] * 0.9:
                    score *= 0.3

            pop_scores.append(score)

        replicate_scores.append(float(np.mean(pop_scores)) if pop_scores else 0.0)

    avg_score = float(np.mean(replicate_scores)) if replicate_scores else 0.0

    return {
        "score": round(avg_score, 4),
        "passed": avg_score > 0.6,
        "details": {
            "replicate_scores": [round(s, 4) for s in replicate_scores],
        },
    }


def evaluate_segregation(
    dfs: List[pd.DataFrame],
    criteria: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate segregation pattern. Placeholder -- requires spatial data not in CSV."""
    return {
        "score": 0.0,
        "passed": False,
        "details": {"error": "segregation evaluator requires spatial data -- not yet implemented"},
    }


# Dispatcher: pattern type -> evaluator function
EVALUATORS = {
    "oscillation": evaluate_oscillation,
    "equilibrium": evaluate_equilibrium,
    "epidemic-curve": evaluate_epidemic_curve,
    "segregation": evaluate_segregation,
}


def evaluate(
    dfs: List[pd.DataFrame],
    criteria: Dict[str, Any],
) -> Dict[str, Any]:
    """Dispatch to the correct evaluator based on criteria type."""
    pattern_type = criteria["type"]
    evaluator = EVALUATORS.get(pattern_type)
    if not evaluator:
        raise ValueError("Unknown pattern type: {}".format(pattern_type))
    return evaluator(dfs, criteria)
