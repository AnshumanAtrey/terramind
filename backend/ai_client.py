"""Async client to the AI inference service (vision/MiniMax-M3)."""
import httpx

from config import settings


async def scan(markers: list[dict]) -> dict | None:
    """Ask the AI service to pick a frame and analyze it against the markers.
    Returns the detection dict (with a 'frame' key), or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=settings.scan_interval_sec + 50) as client:
            r = await client.post(
                f"{settings.ai_service_url}/scan",
                json={"markers": markers},
            )
            r.raise_for_status()
            return r.json()
    except Exception:
        return None


async def fetch_frame(name: str) -> tuple[bytes, str] | None:
    """Pull a camera-feed image from the ai-service so the backend can proxy it
    to the browser (the ai-service stays internal)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{settings.ai_service_url}/frames/{name}")
            r.raise_for_status()
            return r.content, r.headers.get("content-type", "image/jpeg")
    except Exception:
        return None


async def health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            r = await client.get(f"{settings.ai_service_url}/health")
            return r.status_code == 200
    except Exception:
        return False
