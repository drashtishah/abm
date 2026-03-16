"""Shared utilities for scientist skill: CLI runner, CSV loader, definition reader."""

import json
import subprocess
from pathlib import Path
from typing import Any, Dict, Union

import pandas as pd

# Resolve the sim/ directory relative to this script
SIM_DIR = Path(__file__).resolve().parent.parent.parent
CLI_PATH = SIM_DIR / "src" / "cli" / "run.ts"


def run_sim(
    model: str,
    ticks: int,
    config: Dict[str, float],
    seed: int,
    output_path: Union[str, Path],
) -> Path:
    """Run a single simulation via the TypeScript CLI. Returns output path."""
    output_path = Path(output_path)
    cmd = [
        "npx", "tsx", str(CLI_PATH),
        "--model", model,
        "--ticks", str(ticks),
        "--seed", str(seed),
        "--config", json.dumps(config),
        "--output", str(output_path),
    ]
    subprocess.run(cmd, cwd=str(SIM_DIR), capture_output=True, text=True, timeout=60, check=True)
    return output_path


def load_csv(path: Union[str, Path]) -> pd.DataFrame:
    """Load a simulation CSV into a DataFrame."""
    return pd.read_csv(path)


def read_definition(model: str) -> Dict[str, Any]:
    """Get model definition as dict via --dump-definition CLI flag."""
    cmd = [
        "npx", "tsx", str(CLI_PATH),
        "--model", model,
        "--dump-definition",
    ]
    result = subprocess.run(cmd, cwd=str(SIM_DIR), capture_output=True, text=True, timeout=30, check=True)
    return json.loads(result.stdout)
