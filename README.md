# ModTracker

Local dashboard to track staff moderation actions per month.
Exports to Excel (`.xlsx` with charts) and PDF (charts plus ranking table).

## Quick Start

### Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Windows

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py run.py
```

Open `http://127.0.0.1:5000`.

## Configuration

Optional environment variables:

- `MODTRACKER_HOST` default: `127.0.0.1`
- `MODTRACKER_PORT` default: `5000`
- `MODTRACKER_DEBUG` default: `true`
- `MODTRACKER_SECRET_KEY` default: local development key
- `MODTRACKER_DATA_FILE` default: `data/db.json`

Example:

```bash
MODTRACKER_PORT=8000 MODTRACKER_DATA_FILE=./data/local.json python run.py
```

## Project Layout

```text
modtracker/
├── app.py             # Flask app factory and server entrypoint
├── config.py          # environment-based runtime configuration
├── database.py        # JSON persistence layer
├── exporter.py        # PDF and Excel export logic
├── routes.py          # HTML and API routes
├── run.py             # cross-platform launcher
├── requirements.txt
├── data/              # runtime data directory, not committed
├── templates/
└── static/
```

## GitHub Prep

- Runtime data is ignored with `.gitignore`.
- The app recreates `data/db.json` automatically when needed.
- `START.bat` was removed in favor of the cross-platform `run.py` launcher.
