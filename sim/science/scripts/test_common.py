"""Tests for common.py -- CLI runner, CSV loader, definition reader."""

import pytest
from pathlib import Path
from common import read_definition, load_csv, run_sim


def test_read_definition_returns_dict():
    defn = read_definition("wolf-sheep")
    assert defn["id"] == "wolf-sheep"
    assert "configSchema" in defn
    assert "defaultConfig" in defn
    assert "expectedPattern" in defn


def test_read_definition_has_expected_pattern_fields():
    defn = read_definition("wolf-sheep")
    pattern = defn["expectedPattern"]
    assert pattern["type"] == "oscillation"
    assert "minCycles" in pattern
    assert "populations" in pattern


def test_read_definition_config_schema_has_ranges():
    defn = read_definition("wolf-sheep")
    schema = defn["configSchema"]
    for field in schema:
        assert "key" in field
        assert "min" in field
        assert "max" in field


def test_run_sim_produces_csv(tmp_path):
    """Integration test: runs a short sim and checks CSV output."""
    out = tmp_path / "test.csv"
    run_sim("wolf-sheep", ticks=5, config={}, seed=1, output_path=out)
    assert out.exists()
    df = load_csv(out)
    assert len(df) == 5
    assert "tick" in df.columns
    assert "wolf" in df.columns
    assert "sheep" in df.columns
