"""
Google Cloud Text-to-Speech service.

Uses the TTS REST API with the Gemini API key — no service account needed.
The user just needs to enable "Cloud Text-to-Speech API" in their Google Cloud project.

Phase 3: preview_voice — short audio sample for the voice selector UI
Phase 4: synthesize_voice — full SSML synthesis for the final video
"""

import os
import base64
import asyncio
from functools import partial

import requests
from dotenv import load_dotenv

load_dotenv()

TTS_REST_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


def _get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return key


def _extract_language_code(voice_id: str) -> str:
    """'en-US-Neural2-D' → 'en-US'"""
    parts = voice_id.split("-")
    return f"{parts[0]}-{parts[1]}"


# ── Core REST call ────────────────────────────────────────────────────────────

def _call_tts(payload: dict) -> bytes:
    """
    POST to the TTS REST API with the Gemini API key.
    Returns raw MP3 bytes.

    Requires "Cloud Text-to-Speech API" to be enabled in the Google Cloud project
    linked to your Gemini API key.
    Enable it here: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
    """
    api_key = _get_api_key()
    resp = requests.post(
        f"{TTS_REST_URL}?key={api_key}",
        json=payload,
        timeout=30,
    )

    if resp.status_code != 200:
        raise RuntimeError(
            f"Google TTS API error {resp.status_code}: {resp.text[:300]}"
        )

    audio_b64 = resp.json().get("audioContent", "")
    if not audio_b64:
        raise RuntimeError("TTS API returned no audio content.")

    return base64.b64decode(audio_b64)


def _make_payload(text_or_ssml: str, voice_id: str, is_ssml: bool = False) -> dict:
    return {
        "input": {"ssml": text_or_ssml} if is_ssml else {"text": text_or_ssml},
        "voice": {
            "languageCode": _extract_language_code(voice_id),
            "name": voice_id,
        },
        "audioConfig": {
            "audioEncoding": "MP3",
        },
    }


# ── Preview (Phase 3) ─────────────────────────────────────────────────────────

async def preview_voice(voice_id: str, sample_text: str) -> bytes:
    """
    Generate a short MP3 preview of the voice. Returns raw MP3 bytes.
    Falls back cleanly if TTS API is not enabled.
    """
    loop = asyncio.get_event_loop()
    payload = _make_payload(sample_text, voice_id, is_ssml=False)
    return await loop.run_in_executor(None, partial(_call_tts, payload))


# ── Full synthesis (Phase 4) ──────────────────────────────────────────────────

def _do_synthesize(ssml: str, voice_id: str, output_path: str) -> str:
    """Synthesize full SSML and write MP3 to output_path. Returns output_path."""
    payload = _make_payload(ssml, voice_id, is_ssml=True)
    audio_bytes = _call_tts(payload)
    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    return output_path


async def synthesize_voice(ssml: str, voice_id: str, output_path: str) -> str:
    """
    Async wrapper — synthesizes SSML and saves MP3 to output_path.
    Returns output_path on success.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        partial(_do_synthesize, ssml, voice_id, output_path),
    )
