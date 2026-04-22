import json
import uuid
from datetime import datetime

from config import get_data_file

DATA_FILE = get_data_file()


def _empty_db() -> dict:
    return {"staff": []}


def _load() -> dict:
    if not DATA_FILE.exists():
        return _empty_db()
    with DATA_FILE.open("r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return _empty_db()


def _save(db: dict):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)


# ── Staff CRUD ─────────────────────────────────────────────────────────────

def get_all_staff() -> list:
    return _load().get("staff", [])


def add_staff(name: str) -> dict:
    db = _load()
    staff = {
        "id": str(uuid.uuid4())[:8],
        "name": name.strip(),
        "created_at": datetime.now().isoformat(),
        "data": {}
    }
    db["staff"].append(staff)
    _save(db)
    return staff


def update_staff_name(staff_id: str, new_name: str) -> bool:
    db = _load()
    for s in db["staff"]:
        if s["id"] == staff_id:
            s["name"] = new_name.strip()
            _save(db)
            return True
    return False


def delete_staff(staff_id: str) -> bool:
    db = _load()
    before = len(db["staff"])
    db["staff"] = [s for s in db["staff"] if s["id"] != staff_id]
    if len(db["staff"]) < before:
        _save(db)
        return True
    return False


# ── Period data ────────────────────────────────────────────────────────────

def upsert_period(staff_id: str, period: str, bans: int, mutes: int,
                  kicks: int, warns: int, messages: int) -> bool:
    """period format: 'YYYY-MM'"""
    db = _load()
    for s in db["staff"]:
        if s["id"] == staff_id:
            if "data" not in s:
                s["data"] = {}
            s["data"][period] = {
                "bans": max(0, bans),
                "mutes": max(0, mutes),
                "kicks": max(0, kicks),
                "warns": max(0, warns),
                "messages": max(0, messages),
            }
            _save(db)
            return True
    return False


def get_period_data(staff: dict, period: str) -> dict:
    return staff.get("data", {}).get(period, {
        "bans": 0, "mutes": 0, "kicks": 0, "warns": 0, "messages": 0
    })


# ── Aggregation helpers ────────────────────────────────────────────────────

def aggregate_period(period: str) -> dict:
    """Return totals + per-staff list for a given period, sorted by total actions."""
    staff_list = get_all_staff()
    rows = []
    for s in staff_list:
        d = get_period_data(s, period)
        ta = d["bans"] + d["mutes"] + d["kicks"] + d["warns"]
        rows.append({
            "id": s["id"],
            "name": s["name"],
            "bans": d["bans"],
            "mutes": d["mutes"],
            "kicks": d["kicks"],
            "warns": d["warns"],
            "messages": d["messages"],
            "total_actions": ta,
            "grand_total": ta + d["messages"],
        })
    rows.sort(key=lambda x: x["total_actions"], reverse=True)
    totals = {
        "bans": sum(r["bans"] for r in rows),
        "mutes": sum(r["mutes"] for r in rows),
        "kicks": sum(r["kicks"] for r in rows),
        "warns": sum(r["warns"] for r in rows),
        "messages": sum(r["messages"] for r in rows),
        "total_actions": sum(r["total_actions"] for r in rows),
        "grand_total": sum(r["grand_total"] for r in rows),
    }
    return {"rows": rows, "totals": totals, "period": period, "staff_count": len(rows)}
