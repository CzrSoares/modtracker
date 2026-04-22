from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DEFAULT_DATA_FILE = DEFAULT_DATA_DIR / "db.json"


def get_data_file() -> Path:
    custom_path = os.getenv("MODTRACKER_DATA_FILE")
    if custom_path:
        return Path(custom_path).expanduser().resolve()
    return DEFAULT_DATA_FILE


def get_secret_key() -> str:
    return os.getenv("MODTRACKER_SECRET_KEY", "modtracker-local-secret")


def get_host() -> str:
    return os.getenv("MODTRACKER_HOST", "127.0.0.1")


def get_port() -> int:
    return int(os.getenv("MODTRACKER_PORT", "5000"))


def get_debug() -> bool:
    return os.getenv("MODTRACKER_DEBUG", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
