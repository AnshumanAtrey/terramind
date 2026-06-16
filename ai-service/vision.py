"""Vision engine: send an overhead drone frame + the operator's watch markers to
MiniMax-M3 (via TokenRouter) and get back a structured threat detection.

Falls back to a deterministic mock when no key is configured, when AI_FORCE_MOCK
is set, or when the upstream call fails — this is what keeps the platform running
in 'degraded mode' during the chaos / disaster-recovery demo."""
import base64
import json
import random
import re
import time

import httpx

from config import settings
from models import Detection, MarkerIn

ANALYST_SYSTEM = (
    "You are TerraMind AI-CORE, an aerial ISR (intelligence, surveillance, "
    "reconnaissance) image analyst supporting an autonomous drone swarm. You "
    "examine overhead drone/satellite camera frames and decide whether anything "
    "in the frame matches the operator's active watch markers. You are precise, "
    "conservative with confidence, and you never invent objects that are not "
    "visibly present."
)

PRIORITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}

MOCK_LABELS = {
    "convoy": ("vehicle convoy", "Cluster of vehicles in column formation on open ground."),
    "aircraft": ("aircraft on apron", "Fixed-wing airframe detected near the runway threshold."),
    "personnel": ("personnel cluster", "Group of dismounted personnel near the perimeter."),
    "default": ("unclassified contact", "Anomalous signature flagged for operator review."),
}


def _build_user_prompt(markers: list[MarkerIn]) -> str:
    if markers:
        lines = "\n".join(
            f"  {i + 1}. {m.description}  [priority: {m.priority}]" for i, m in enumerate(markers)
        )
    else:
        lines = "  (no active watch markers — report anything militarily significant)"
    return (
        "Analyze this overhead drone camera frame.\n\n"
        "ACTIVE WATCH MARKERS:\n"
        f"{lines}\n\n"
        "Decide whether the frame visibly contains anything matching ANY watch marker "
        "(or, if none are listed, anything militarily significant).\n\n"
        "Respond with ONLY a JSON object, no prose, in exactly this shape:\n"
        "{\n"
        '  "detected": true|false,\n'
        '  "label": "<=4 word label of what you actually see",\n'
        '  "confidence": <integer 0-100>,\n'
        '  "matched_marker_index": <1-based index of the matched marker, or null>,\n'
        '  "summary": "one concise analyst sentence describing the evidence"\n'
        "}\n"
        "If nothing matches, set detected=false and confidence low."
    )


def _strip_and_extract_json(text: str) -> dict:
    # MiniMax-M3 emits <think>...</think> reasoning before the answer — drop it.
    t = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    # strip markdown code fences if present
    t = re.sub(r"```(?:json)?", "", t).strip()
    match = re.search(r"\{.*\}", t, re.DOTALL)
    if not match:
        raise ValueError(f"no JSON object in model reply: {text[:200]!r}")
    return json.loads(match.group(0))


def _to_detection(raw: dict, markers: list[MarkerIn], source: str, latency_ms: int) -> Detection:
    detected = bool(raw.get("detected", False))
    idx_1 = raw.get("matched_marker_index")
    matched_index = None
    priority = "low"
    if isinstance(idx_1, int) and 1 <= idx_1 <= len(markers):
        matched_index = idx_1 - 1
        priority = markers[matched_index].priority
    elif detected and markers:
        # model said detected but didn't index — attribute to highest-priority marker
        matched_index = max(range(len(markers)), key=lambda i: PRIORITY_RANK.get(markers[i].priority, 0))
        priority = markers[matched_index].priority

    confidence = int(max(0, min(100, raw.get("confidence", 0))))
    return Detection(
        detected=detected,
        label=str(raw.get("label", "contact"))[:48],
        confidence=confidence,
        priority=priority,
        summary=str(raw.get("summary", ""))[:240],
        matched_marker_index=matched_index,
        model=settings.ai_model,
        source=source,
        latency_ms=latency_ms,
    )


def _mock_detection(markers: list[MarkerIn], latency_ms: int) -> Detection:
    """Deterministic-enough fallback so the platform never goes dark."""
    if markers and random.random() < 0.7:
        idx = max(range(len(markers)), key=lambda i: PRIORITY_RANK.get(markers[i].priority, 0))
        m = markers[idx]
        key = next((k for k in MOCK_LABELS if k in m.description.lower()), "default")
        label, summary = MOCK_LABELS[key]
        return Detection(
            detected=True,
            label=label,
            confidence=random.randint(70, 94),
            priority=m.priority,
            summary=f"[degraded] {summary}",
            matched_marker_index=idx,
            model=settings.ai_model,
            source="mock",
            latency_ms=latency_ms,
        )
    return Detection(
        detected=False,
        label="no contact",
        confidence=random.randint(10, 40),
        priority="low",
        summary="[degraded] No watch-marker match in frame.",
        matched_marker_index=None,
        model=settings.ai_model,
        source="mock",
        latency_ms=latency_ms,
    )


def analyze(image_bytes: bytes, markers: list[MarkerIn]) -> Detection:
    start = time.monotonic()
    if not settings.live_enabled:
        return _mock_detection(markers, int((time.monotonic() - start) * 1000))

    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "model": settings.ai_model,
        "messages": [
            {"role": "system", "content": [{"type": "text", "text": ANALYST_SYSTEM}]},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _build_user_prompt(markers)},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                ],
            },
        ],
    }
    try:
        resp = httpx.post(
            f"{settings.tokenrouter_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.tokenrouter_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=settings.ai_timeout_sec,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        raw = _strip_and_extract_json(content)
        latency = int((time.monotonic() - start) * 1000)
        return _to_detection(raw, markers, source="minimax-m3", latency_ms=latency)
    except Exception:
        # Any upstream failure → degrade gracefully, never crash the swarm.
        return _mock_detection(markers, int((time.monotonic() - start) * 1000))
