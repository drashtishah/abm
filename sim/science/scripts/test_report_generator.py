"""Tests for report_generator.py — verify templates render with fixture data."""

import json
import sys
from pathlib import Path
from typing import Any, Dict

import pytest


@pytest.fixture
def science_dir(tmp_path, monkeypatch):
    """Set up a mock science directory with fixture analysis data."""
    import report_generator

    monkeypatch.setattr(report_generator, "SCIENCE_DIR", tmp_path)
    # TEMPLATES_DIR must stay pointing at the real templates so Jinja2 can load them
    real_templates = Path(__file__).resolve().parent.parent / "templates"
    monkeypatch.setattr(report_generator, "TEMPLATES_DIR", real_templates)
    return tmp_path


@pytest.fixture
def mock_model(science_dir):
    """Create a mock model directory with fixture Phase 1 and Phase 3 data."""
    model_dir = science_dir / "test-model"
    analysis_dir = model_dir / "analysis"
    analysis_dir.mkdir(parents=True)

    phase1 = {
        "model": "test-model",
        "phase": 1,
        "method": "Morris",
        "n_trajectories": 10,
        "n_replicates": 3,
        "total_runs": 30,
        "failure_rate": 0.0,
        "ranked_params": [
            {"name": "paramA", "mu_star": 0.8, "sigma": 0.3},
            {"name": "paramB", "mu_star": 0.2, "sigma": 0.1},
        ],
        "recommended_top_params": ["paramA"],
    }
    (analysis_dir / "phase1_results.json").write_text(json.dumps(phase1))

    phase3 = {
        "model": "test-model",
        "phase": 3,
        "method": "differential_evolution",
        "best_score": 0.85,
        "best_params": {"paramA": 5.0},
        "total_evaluations": 50,
        "total_runs": 500,
        "convergence_log": [],
        "comparison_with_defaults": {
            "paramA": {"default": 3.0, "optimized": 5.0, "changed": True},
        },
    }
    (analysis_dir / "phase3_results.json").write_text(json.dumps(phase3))

    return "test-model"


def test_model_report_renders(mock_model, science_dir, monkeypatch):
    """Report HTML should contain model name and phase sections."""
    import common
    import report_generator

    # Mock read_definition to avoid CLI call — it's imported locally inside
    # generate_model_report via `from common import read_definition`
    def fake_read_definition(model):
        return {
            "expectedPattern": {
                "type": "oscillation",
                "description": "Test pattern",
                "minTicks": 100,
                "populations": ["a", "b"],
                "minCycles": 2,
                "maxExtinctionRate": 0.1,
            }
        }

    monkeypatch.setattr(common, "read_definition", fake_read_definition)

    report_generator.generate_model_report(mock_model)
    report_path = science_dir / mock_model / "report.html"
    assert report_path.exists()
    html = report_path.read_text()
    assert "test-model" in html
    assert "Morris" in html
    assert "paramA" in html
    assert "0.85" in html  # Phase 3 best score


def test_index_renders(science_dir):
    """Index should list models that have report.html."""
    import report_generator

    # Create a fake model with report
    model_dir = science_dir / "fake-model"
    model_dir.mkdir()
    (model_dir / "report.html").write_text("<html></html>")

    report_generator.generate_index()
    index_path = science_dir / "index.html"
    assert index_path.exists()
    html = index_path.read_text()
    assert "Fake Model" in html


def test_index_empty_when_no_models(science_dir):
    """Index should render even with no models."""
    import report_generator

    report_generator.generate_index()
    index_path = science_dir / "index.html"
    assert index_path.exists()
