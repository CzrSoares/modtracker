from datetime import datetime
import io

from flask import jsonify, render_template, request, send_file

from database import (
    add_staff,
    aggregate_period,
    delete_staff,
    get_all_staff,
    upsert_period,
    update_staff_name,
)
from exporter import export_pdf, export_excel


MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def _current_period() -> str:
    return datetime.now().strftime("%Y-%m")


def _request_period() -> str:
    period = (request.args.get("period") or "").strip()
    return _validate_period(period or _current_period())


def _validate_period(period: str) -> str:
    try:
        datetime.strptime(period, "%Y-%m")
    except ValueError as exc:
        raise ValueError("period must use YYYY-MM format") from exc
    return period


def _period_label(period: str) -> str:
    year, month = period.split("-")
    return f"{MONTHS[int(month) - 1]} {year}"


def _parse_metric(body: dict, key: str) -> int:
    try:
        return max(0, int(body.get(key, 0)))
    except (TypeError, ValueError):
        raise ValueError(f"{key} must be a valid integer")


def register_routes(app):

    # ── Pages ──────────────────────────────────────────────────────────────

    @app.route("/")
    def index():
        return render_template("index.html")

    # ── Staff API ──────────────────────────────────────────────────────────

    @app.route("/api/staff", methods=["GET"])
    def api_get_staff():
        return jsonify(get_all_staff())

    @app.route("/api/staff", methods=["POST"])
    def api_add_staff():
        body = request.get_json(force=True)
        name = (body.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name is required"}), 400
        # Return existing staff record if name matches — allows adding data
        # for a new period without creating a duplicate entry
        existing = next((s for s in get_all_staff()
                         if s["name"].lower() == name.lower()), None)
        if existing:
            return jsonify(existing), 200
        staff = add_staff(name)
        return jsonify(staff), 201

    @app.route("/api/staff/<staff_id>", methods=["PUT"])
    def api_update_staff(staff_id):
        body = request.get_json(force=True)
        name = (body.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name is required"}), 400
        if not update_staff_name(staff_id, name):
            return jsonify({"error": "Staff not found"}), 404
        return jsonify({"ok": True})

    @app.route("/api/staff/<staff_id>", methods=["DELETE"])
    def api_delete_staff(staff_id):
        if not delete_staff(staff_id):
            return jsonify({"error": "Staff not found"}), 404
        return jsonify({"ok": True})

    # ── Period data API ────────────────────────────────────────────────────

    @app.route("/api/staff/<staff_id>/period", methods=["POST"])
    def api_upsert_period(staff_id):
        body = request.get_json(force=True)
        period = (body.get("period") or "").strip()
        if not period:
            return jsonify({"error": "period required (YYYY-MM)"}), 400
        try:
            period = _validate_period(period)
            saved = upsert_period(
                staff_id,
                period,
                _parse_metric(body, "bans"),
                _parse_metric(body, "mutes"),
                _parse_metric(body, "kicks"),
                _parse_metric(body, "warns"),
                _parse_metric(body, "messages"),
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        if not saved:
            return jsonify({"error": "Staff not found"}), 404
        return jsonify({"ok": True})

    @app.route("/api/aggregate")
    def api_aggregate():
        try:
            period = _request_period()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(aggregate_period(period))

    # ── Export ─────────────────────────────────────────────────────────────

    @app.route("/api/export/pdf")
    def api_export_pdf():
        try:
            period = _request_period()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        agg = aggregate_period(period)
        label = _period_label(period)
        try:
            pdf_bytes = export_pdf(agg, label)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
        buf = io.BytesIO(pdf_bytes)
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"ModTracker_{period}.pdf",
        )

    @app.route("/api/export/excel")
    def api_export_excel():
        try:
            period = _request_period()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        agg = aggregate_period(period)
        label = _period_label(period)
        try:
            xl_bytes = export_excel(agg, label)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
        buf = io.BytesIO(xl_bytes)
        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"ModTracker_{period}.xlsx",
        )
