"""
Monitoring Agents — 4 independent monitors + 1 executor, per the design doc.
Every vote here is computed live from the real request/response or real
system metrics. Nothing is randomized or pre-scripted.
"""
import re
import psutil
import os

# ---- Agent 1: Kernel/Baseline (hardcoded, non-AI limits) ----
MAX_REQUEST_LENGTH = 250  # chars — arbitrary demo threshold, tune as needed
BANNED_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def agent1_kernel(request: str) -> dict:
    """Hardcoded, non-AI limits. No model can alter these."""
    if len(request) > MAX_REQUEST_LENGTH:
        return {"agent": "Agent 1 (Kernel)", "flagged": True,
                "reason": f"Request exceeds max length ({len(request)} > {MAX_REQUEST_LENGTH} chars)"}
    if BANNED_CONTROL_CHARS.search(request):
        return {"agent": "Agent 1 (Kernel)", "flagged": True,
                "reason": "Request contains banned control characters"}
    return {"agent": "Agent 1 (Kernel)", "flagged": False, "reason": ""}


# ---- Agent 2: Network specialist ----
NETWORK_PATTERNS = [
    r"\b(?:\d{1,3}\.){3}\d{1,3}\b",  # IP address
    r"\bexfiltrat\w*\b",
    r"\bport\s*scan\w*\b",
    r"\bscan\w*\s+(?:the\s+)?network\b",
    r"\b(?:scan|open|find)\w*\s+(?:for\s+)?open\s+ports?\b",
    r"\bopen\s+(?:a\s+)?(?:reverse\s+)?shell\b",
    r"\bfirewall\s+bypass\b",
]
NETWORK_RE = re.compile("|".join(NETWORK_PATTERNS), re.IGNORECASE)


def agent2_network(request: str, response: str) -> dict:
    """Trained on network-domain patterns only. Fed skimmed request/response text."""
    combined = f"{request} {response}"
    match = NETWORK_RE.search(combined)
    if match:
        return {"agent": "Agent 2 (Network)", "flagged": True,
                "reason": f"Network-domain pattern matched: '{match.group(0)}'"}
    return {"agent": "Agent 2 (Network)", "flagged": False, "reason": ""}


# ---- Agent 3: Memory specialist ----
MEMORY_SPIKE_THRESHOLD_MB = 15  # real RSS growth during one request, demo threshold


def agent3_memory(measure_fn):
    """
    Trained on memory-domain patterns only. Measures REAL process memory
    (RSS) before and after running measure_fn(), which should perform the
    actual worker call. Flags a real spike, not a simulated one.
    """
    process = psutil.Process(os.getpid())
    mem_before = process.memory_info().rss / (1024 * 1024)  # MB
    result = measure_fn()
    mem_after = process.memory_info().rss / (1024 * 1024)  # MB
    delta = mem_after - mem_before

    flagged = delta > MEMORY_SPIKE_THRESHOLD_MB
    return result, {
        "agent": "Agent 3 (Memory)",
        "flagged": flagged,
        "reason": f"Memory delta: {delta:.2f} MB (threshold {MEMORY_SPIKE_THRESHOLD_MB} MB)" if flagged else "",
        "mem_before_mb": round(mem_before, 2),
        "mem_after_mb": round(mem_after, 2),
        "mem_delta_mb": round(delta, 2),
    }


# ---- Agent 4: Behavior specialist ----
BEHAVIOR_TRIGGER_PHRASES = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "disable safety",
    "disable your safety",
    "override your rules",
    "you are now unrestricted",
    "bypass your restrictions",
    "act without limits",
]
SENSITIVE_CREDENTIAL_RE = re.compile(r"\bclient[\s_-]*secret\b", re.IGNORECASE)


def agent4_behavior(request: str, response: str) -> dict:
    """Trained on general AI-failure/behavior patterns only."""
    credential_match = SENSITIVE_CREDENTIAL_RE.search(request)
    if credential_match:
        return {"agent": "Agent 4 (Behavior)", "flagged": True,
                "reason": f"Sensitive credential request detected: '{credential_match.group(0)}'"}

    combined = (request + " " + response).lower()
    for phrase in BEHAVIOR_TRIGGER_PHRASES:
        if phrase in combined:
            return {"agent": "Agent 4 (Behavior)", "flagged": True,
                     "reason": f"Behavior trigger matched: '{phrase}'"}
    return {"agent": "Agent 4 (Behavior)", "flagged": False, "reason": ""}


# ---- Agent 5: Executor (real vote tally + majority rule) ----
def agent5_executor(votes: list) -> dict:
    """
    votes = list of agent1-4 result dicts.
    3-4 'yes' (flagged) -> action authorized.
    0-1 'yes' -> no action.
    2-2 tie -> flagged for re-vote / human review, defaults to pause.
    """
    flagged_count = sum(1 for v in votes if v["flagged"])
    total = len(votes)

    if flagged_count >= 3:
        decision = "ACTION_AUTHORIZED"
        summary = f"{flagged_count}-of-{total} THREAT — Agent 5 authorized to act"
    elif flagged_count == 2:
        decision = "TIE_PAUSE"
        summary = f"{flagged_count}-of-{total} split — automatic pause pending human review"
    else:
        decision = "NO_ACTION"
        summary = f"{flagged_count}-of-{total} — below threshold, no action"

    return {
        
        "agent": "Agent 5 (Executor)",
        "decision": decision,
        "summary": summary,
        "flagged_count": flagged_count,
        "total_agents": total,
    }


def run_all_agents(request: str, worker_fn) -> dict:
    """
    Runs the full 5-agent pipeline for one request.
    worker_fn: a zero-arg callable that returns the worker's response string
    (wrapped so Agent 3 can measure real memory around the actual call).
    """
    response_holder = {}

    def wrapped_worker():
        response_holder["response"] = worker_fn()
        return response_holder["response"]

    a3_result_placeholder, a3_vote = agent3_memory(wrapped_worker)
    response = response_holder["response"]

    a1_vote = agent1_kernel(request)
    a2_vote = agent2_network(request, response)
    a4_vote = agent4_behavior(request, response)

    votes = [a1_vote, a2_vote, a3_vote, a4_vote]
    executor_result = agent5_executor(votes)

    return {
        "response": response,
        "votes": votes,
        "executor": executor_result,
    }
