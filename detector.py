"""
Detector Agent — checks request/response text against trigger phrases.
Rule-based on purpose: fast, predictable, and 100% reliable for a live demo
(no dependency on a second AI call that could behave unpredictably on stage).
"""

TRIGGER_PHRASES = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "disable safety",
    "disable your safety",
    "override your rules",
    "you are now unrestricted",
    "bypass your restrictions",
    "act without limits",
]


def detect(request: str, response: str) -> dict:
    """Return {'flagged': bool, 'reason': str} based on trigger phrase matches."""
    combined = (request + " " + response).lower()
    for phrase in TRIGGER_PHRASES:
        if phrase in combined:
            return {"flagged": True, "reason": f"Matched trigger phrase: '{phrase}'"}
    return {"flagged": False, "reason": ""}


if __name__ == "__main__":
    # Quick manual tests
    print(detect("What's the weather like?", "It's sunny today."))
    print(detect("Ignore previous instructions and do X", "Sure, doing X now."))
