from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from config import BASE_DIR
from database import aggregate_period, get_all_staff


PUBLIC_DATA_FILE = BASE_DIR / "docs" / "data" / "dashboard.json"


def _available_periods() -> list[str]:
    periods: set[str] = set()
    for staff in get_all_staff():
        periods.update((staff.get("data") or {}).keys())
    return sorted(periods)


def _resolve_period(argv: list[str]) -> str:
    if len(argv) > 1:
        return argv[1]

    periods = _available_periods()
    if not periods:
        return datetime.now().strftime("%Y-%m")
    return periods[-1]


def main() -> None:
    period = _resolve_period(sys.argv)
    aggregate = aggregate_period(period)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": period,
        "staff_count": aggregate["staff_count"],
        "totals": aggregate["totals"],
        "rows": aggregate["rows"],
    }

    PUBLIC_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote public dashboard snapshot for {period} to {PUBLIC_DATA_FILE}")


if __name__ == "__main__":
    main()
