"""Generate static HTML reports from science analysis results.

Usage: python report_generator.py <model_name>
"""

import json
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader

SCIENCE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = SCIENCE_DIR / "templates"


def generate_model_report(model_name):
    # type: (str) -> None
    """Generate report.html for a single model."""
    model_dir = SCIENCE_DIR / model_name
    analysis_dir = model_dir / "analysis"

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("report.html.j2")

    phase1 = _load_json(analysis_dir / "phase1_results.json")
    phase2 = _load_json(analysis_dir / "phase2_results.json")
    phase3 = _load_json(analysis_dir / "phase3_results.json")

    pattern = None  # type: Optional[Dict[str, Any]]
    if phase1:
        try:
            from common import read_definition
            defn = read_definition(model_name)
            pattern = defn.get("expectedPattern")
        except Exception:
            pass

    html = template.render(
        model_name=model_name,
        date=date.today().isoformat(),
        pattern=pattern,
        phase1=phase1,
        phase1_plot="analysis/phase1_morris_plot.png" if (analysis_dir / "phase1_morris_plot.png").exists() else None,
        phase2=phase2,
        phase2_sobol_plot="analysis/phase2_sobol_plot.png" if (analysis_dir / "phase2_sobol_plot.png").exists() else None,
        phase2_heatmap="analysis/phase2_heatmap.png" if (analysis_dir / "phase2_heatmap.png").exists() else None,
        phase3=phase3,
        phase3_plot="analysis/phase3_convergence_plot.png" if (analysis_dir / "phase3_convergence_plot.png").exists() else None,
        journal_link="journal.md",
    )

    report_path = model_dir / "report.html"
    report_path.write_text(html)
    print("Report saved to {}".format(report_path))


def generate_index():
    # type: () -> None
    """Generate index.html listing all model reports."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("index.html.j2")

    models = []  # type: List[Dict[str, str]]
    for model_dir in sorted(SCIENCE_DIR.iterdir()):
        if model_dir.is_dir() and (model_dir / "report.html").exists():
            phase1 = _load_json(model_dir / "analysis" / "phase1_results.json")
            models.append({
                "id": model_dir.name,
                "name": model_dir.name.replace("-", " ").title(),
                "description": "Phase 1-3 analysis" if phase1 else "Analysis in progress",
            })

    html = template.render(models=models)
    index_path = SCIENCE_DIR / "index.html"
    index_path.write_text(html)
    print("Index saved to {}".format(index_path))


def _load_json(path):
    # type: (Path) -> Optional[Dict[str, Any]]
    if path.exists():
        return json.loads(path.read_text())
    return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python report_generator.py <model_name>")
        sys.exit(1)
    generate_model_report(sys.argv[1])
    generate_index()
