"""Tests for pattern evaluators."""

import numpy as np
import pandas as pd
import pytest
from evaluators import evaluate_oscillation, evaluate_equilibrium


class TestOscillationEvaluator:
    def _make_df(self, wolf_counts, sheep_counts):
        """Helper: create a DataFrame resembling sim CSV output."""
        n = len(wolf_counts)
        return pd.DataFrame({
            "tick": range(n),
            "wolf": wolf_counts,
            "sheep": sheep_counts,
        })

    def test_perfect_oscillation_passes(self):
        """Sinusoidal populations should score high and pass."""
        t = np.arange(500)
        wolves = 50 + 30 * np.sin(t * 2 * np.pi / 100)
        sheep = 100 + 50 * np.sin(t * 2 * np.pi / 100 + np.pi / 2)
        df = self._make_df(wolves.astype(int), sheep.astype(int))
        criteria = {
            "type": "oscillation",
            "minTicks": 500,
            "populations": ["wolf", "sheep"],
            "minCycles": 3,
            "maxExtinctionRate": 0.1,
        }
        result = evaluate_oscillation([df], criteria)
        assert result["passed"] is True
        assert result["score"] > 0.7

    def test_flat_population_fails(self):
        """Constant populations should fail oscillation criteria."""
        df = self._make_df([50] * 500, [100] * 500)
        criteria = {
            "type": "oscillation",
            "minTicks": 500,
            "populations": ["wolf", "sheep"],
            "minCycles": 3,
            "maxExtinctionRate": 0.1,
        }
        result = evaluate_oscillation([df], criteria)
        assert result["passed"] is False
        assert result["score"] <= 0.3

    def test_extinction_penalizes_score(self):
        """If population goes to 0, extinction rate should be flagged."""
        wolves = [50] * 100 + [0] * 400
        sheep = [100] * 500
        df = self._make_df(wolves, sheep)
        criteria = {
            "type": "oscillation",
            "minTicks": 500,
            "populations": ["wolf", "sheep"],
            "minCycles": 3,
            "maxExtinctionRate": 0.1,
        }
        result = evaluate_oscillation([df], criteria)
        assert result["score"] < 0.5
        assert result["details"]["extinction_rate"] > 0

    def test_multiple_replicates_averaged(self):
        """Score should average across multiple DataFrames."""
        t = np.arange(500)
        good = self._make_df(
            (50 + 30 * np.sin(t * 2 * np.pi / 100)).astype(int),
            (100 + 50 * np.sin(t * 2 * np.pi / 100)).astype(int),
        )
        bad = self._make_df([50] * 500, [100] * 500)
        criteria = {
            "type": "oscillation",
            "minTicks": 500,
            "populations": ["wolf", "sheep"],
            "minCycles": 3,
            "maxExtinctionRate": 0.1,
        }
        result = evaluate_oscillation([good, bad], criteria)
        assert 0.2 < result["score"] < 0.9


class TestEquilibriumEvaluator:
    def test_stable_population_passes(self):
        """Population stabilizing to constant should pass."""
        n = 500
        np.random.seed(42)
        vals = [100 + int(50 * np.exp(-t / 50)) + np.random.randint(-2, 3) for t in range(n)]
        df = pd.DataFrame({"tick": range(n), "agent": vals})
        criteria = {
            "type": "equilibrium",
            "minTicks": 500,
            "populations": ["agent"],
            "stabilizeByTick": 300,
            "maxVariance": 100,
        }
        result = evaluate_equilibrium([df], criteria)
        assert result["passed"] is True
        assert result["score"] > 0.5
