"""
Google Cloud Text-to-Speech service.

Uses the TTS REST API with the Gemini API key — no service account needed.
The user just needs to enable "Cloud Text-to-Speech API" in their Google Cloud project.

Phase 3: preview_voice — short audio sample for the voice selector UI
Phase 4: synthesize_voice — full SSML/text synthesis for the final video

NOTE: Chirp3-HD voices (e.g. en-US-Chirp3-HD-*) do NOT support SSML.
      This module auto-detects them, strips SSML tags to plain text,
      and routes to the v1beta1 endpoint which supports Chirp3-HD.
"""

import os
import re
import base64
import asyncio
from functools import partial

import requests
from dotenv import load_dotenv

load_dotenv()

TTS_REST_URL        = "https://texttospeech.googleapis.com/v1/text:synthesize"
TTS_REST_URL_BETA   = "https://texttospeech.googleapis.com/v1beta1/text:synthesize"


def _get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return key


def _extract_language_code(voice_id: str) -> str:
    """'en-US-Chirp3-HD-Charon' → 'en-US'"""
    parts = voice_id.split("-")
    return f"{parts[0]}-{parts[1]}"


def _is_chirp3_hd(voice_id: str) -> bool:
    """Return True for Chirp3-HD voices which require plain text + v1beta1."""
    return "Chirp3-HD" in voice_id


def _ssml_to_plain_text(ssml: str) -> str:
    """Strip SSML/XML tags and collapse whitespace → plain text."""
    text = re.sub(r"<[^>]+>", " ", ssml)
    return re.sub(r"\s+", " ", text).strip()


# ── Core REST call ────────────────────────────────────────────────────────────

def _call_tts(payload: dict, use_beta: bool = False) -> bytes:
    """
    POST to the TTS REST API with the Gemini API key.
    Returns raw MP3 bytes.

    Requires "Cloud Text-to-Speech API" to be enabled in the Google Cloud project
    linked to your Gemini API key.
    Enable it here: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com

    use_beta=True routes to v1beta1 (required for Chirp3-HD voices).
    """
    api_key = _get_api_key()
    url = TTS_REST_URL_BETA if use_beta else TTS_REST_URL
    resp = requests.post(
        f"{url}?key={api_key}",
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
    chirp = _is_chirp3_hd(voice_id)
    payload = _make_payload(sample_text, voice_id, is_ssml=False)
    return await loop.run_in_executor(None, partial(_call_tts, payload, chirp))


# ── Full synthesis (Phase 4) ──────────────────────────────────────────────────

def _do_synthesize(ssml: str, voice_id: str, output_path: str) -> str:
    """Synthesize speech and write MP3 to output_path. Returns output_path.

    For Chirp3-HD voices: SSML tags are stripped → plain text, routed to v1beta1.
    For all other voices: full SSML is sent as-is to v1.
    """
    chirp = _is_chirp3_hd(voice_id)
    if chirp:
        text_input = _ssml_to_plain_text(ssml)
        payload = _make_payload(text_input, voice_id, is_ssml=False)
    else:
        payload = _make_payload(ssml, voice_id, is_ssml=True)
    audio_bytes = _call_tts(payload, use_beta=chirp)
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
