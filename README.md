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

## Public GitHub Pages Dashboard

The repo now supports two modes:

- Local Flask app: full dashboard plus admin management for your machine only
- Public static site: dashboard-only page served from `docs/` on GitHub Pages

### Publish the latest snapshot

After you update staff data locally, run:

```bash
python export_public_snapshot.py
```

That script:

- reads your local `data/db.json`
- picks the latest available period by default
- writes one public file at `docs/data/dashboard.json`
- replaces the previous public month, so only the newest published period remains visible on GitHub Pages

You can also publish a specific period manually:

```bash
python export_public_snapshot.py 2026-04
```

### GitHub Pages setup

On GitHub, configure Pages to deploy from:

- Branch: your main branch
- Folder: `/docs`

Then your workflow becomes:

1. Run the local app and update data.
2. Run `python export_public_snapshot.py`.
3. Commit the updated `docs/` files.
4. Push to GitHub.
5. GitHub Pages updates the public dashboard.

The admin tab is not included in `docs/`, so the public site exposes only the dashboard snapshot.

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
