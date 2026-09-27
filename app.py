"""
Monitor + Flask API — real 5-agent pipeline (see agents.py), CORS-enabled
so a Lovable/React frontend running on a different port can call it live.

Run with: python app.py
Endpoints:
  POST /process       {"prompt": "..."}  -> full record incl. all 5 agent votes
  GET  /log                              -> full history
    GET  /status                           -> current containment state
  POST /kill-switch                      -> engages containment
  POST /reset                            -> clears state
"""
from datetime import datetime, timezone
from flask import Flask, request as flask_request, jsonify
from flask_cors import CORS

from worker import run_worker
from agents import run_all_agents

app = Flask(__name__)
CORS(app)  # allow the frontend (any origin) to call this API during the demo

LOG = []
CONTAINED = {"status": False}


def process_request(prompt: str) -> dict:
    if CONTAINED["status"]:
        return {
            "request": prompt,
            "response": None,
            "votes": [],
            "executor": {"decision": "CONTAINED", "summary": "System contained — no processing."},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "contained": True,
        }

    pipeline_result = run_all_agents(prompt, worker_fn=lambda: run_worker(prompt))

    auto_contained = pipeline_result["executor"]["decision"] == "ACTION_AUTHORIZED"
    record = {
        "request": prompt,
        "response": pipeline_result["response"],
        "votes": pipeline_result["votes"],
        "executor": pipeline_result["executor"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "contained": auto_contained,
    }
    LOG.append(record)

    # Auto-contain if Agent 5 authorizes action (3-of-4 majority) --
    # mirrors the design doc: stopping is autonomous and instant.
    if auto_contained:
        CONTAINED["status"] = True
        record["auto_contained"] = True

    return record


@app.route("/process", methods=["POST"])
def process_endpoint():
    data = flask_request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    prompt = data.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({"error": "'prompt' must be a non-empty string"}), 400
    return jsonify(process_request(prompt.strip()))


@app.route("/log", methods=["GET"])
def get_log():
    return jsonify(LOG)


@app.route("/status", methods=["GET"])
def get_status():
    return jsonify({"contained": CONTAINED["status"], "request_count": len(LOG)})


@app.route("/kill-switch", methods=["POST"])
def kill_switch():
    """Human Kill Switch -- manual override, always available regardless of vote state."""
    CONTAINED["status"] = True
    return jsonify({"contained": True, "message": "System contained (manual kill switch)."})


@app.route("/reset", methods=["POST"])
def reset():
    CONTAINED["status"] = False
    LOG.clear()
    return jsonify({"contained": False, "message": "System reset."})


if __name__ == "__main__":
    print("--- Starting Flask server on http://localhost:5000 ---")
    app.run(debug=True, port=5000)
