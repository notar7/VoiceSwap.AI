"""
Gemini service — all interactions with Gemini 2.0 Flash.
Uses the official `google-genai` SDK (v1.x+).

Gemini plays THREE distinct roles in VoiceSwap (important for judging):
  1. Transcription  — speech → text with word-level timestamps
  2. Emotion Analysis — tone, pace, energy, emphasis detection
  3. Voice Direction — structured JSON used to build expressive SSML for TTS
"""

import os
import json
import time
import asyncio
from functools import partial

from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv()

# ── Client (lazy singleton) ───────────────────────────────────────────────────

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return a cached Gemini client, raising clearly if the key is missing."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env and restart."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _model() -> str:
    """Which model to use — configurable via GEMINI_MODEL in .env."""
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# ── Prompts ───────────────────────────────────────────────────────────────────

# ── Single combined prompt (1 API call instead of 2 = doubles daily quota) ────
# Gemini analyzes the audio ONCE and returns transcription + voice direction
# together. The result is split into the two shapes the pipeline expects.

COMBINED_PROMPT = """
You are an expert voice director AND transcription system. Analyze the speech in this audio file.

Return a single JSON object with ALL of these exact fields:
- "transcript": full text of the speech
- "words": array of { "word": string, "start_time": float, "end_time": float } for each word
- "total_duration": total duration in seconds
- "overall_tone": one sentence describing the overall tone
- "pace": "slow" | "moderate" | "fast"
- "energy": "low" | "medium" | "high"
- "emphasis_words": array of words that should be stressed
- "emotion_segments": array of { "start_time": float, "end_time": float, "emotion": string, "suggested_pitch": string }
- "ssml_hints": a short instruction for a TTS system on how to read this text expressively

Return only valid JSON, no markdown.
""".strip()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_json(text: str) -> str:
    """Strip markdown code fences that Gemini sometimes adds despite instructions."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _parse_json(text: str) -> dict:
    """Parse Gemini's text response as JSON with a clear error if it fails."""
    cleaned = _clean_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini returned invalid JSON: {e}\n\nRaw response:\n{text[:500]}"
        )


def _upload_and_analyze(audio_path: str, model_name: str) -> dict:
    """
    Blocking function that:
      1. Uploads the WAV to Gemini Files API
      2. Waits for ACTIVE state
      3. Runs transcription prompt
      4. Runs emotion analysis prompt
      5. Deletes the remote file

    Run via loop.run_in_executor so it doesn't block the event loop.
    """
    client = _get_client()

    # ── Upload ────────────────────────────────────────────────────────────────
    with open(audio_path, "rb") as f:
        uploaded_file = client.files.upload(
            file=f,
            config=genai_types.UploadFileConfig(
                mime_type="audio/wav",
                display_name=os.path.basename(audio_path),
            ),
        )

    # ── Wait for ACTIVE ───────────────────────────────────────────────────────
    deadline = time.time() + 90  # 90s timeout
    while time.time() < deadline:
        info = client.files.get(name=uploaded_file.name)
        # State can be an enum or string depending on SDK version — handle both
        state_str = info.state.name if hasattr(info.state, "name") else str(info.state)
        state_str = state_str.upper()
        if "ACTIVE" in state_str:
            break
        if "FAILED" in state_str:
            raise RuntimeError("Gemini Files API: file processing failed.")
        time.sleep(2)
    else:
        raise TimeoutError("Gemini file did not become ACTIVE within 90 seconds.")

    # Use the refreshed file reference that has the confirmed ACTIVE state
    active_file = client.files.get(name=uploaded_file.name)

    try:
        # ── Single combined call: transcription + emotion in one shot ─────────
        # This halves API usage — critical given 20 RPD free tier limit.
        response = client.models.generate_content(
            model=model_name,
            contents=[active_file, COMBINED_PROMPT],
        )
        data = _parse_json(response.text)

        # ── Split the combined response into the two expected shapes ──────────
        transcript_data = {
            "transcript":     data.get("transcript", ""),
            "words":          data.get("words", []),
            "total_duration": data.get("total_duration", 0.0),
        }
        voice_direction_data = {
            "overall_tone":     data.get("overall_tone", ""),
            "pace":             data.get("pace", "moderate"),
            "energy":           data.get("energy", "medium"),
            "emphasis_words":   data.get("emphasis_words", []),
            "emotion_segments": data.get("emotion_segments", []),
            "ssml_hints":       data.get("ssml_hints", ""),
        }

    finally:
        # ── Always clean up remote file ───────────────────────────────────────
        try:
            client.files.delete(name=uploaded_file.name)
        except Exception:
            pass  # Non-fatal — files auto-expire after 48h

    return {
        "transcript": transcript_data,
        "voice_direction": voice_direction_data,
    }


# ── Public async API ──────────────────────────────────────────────────────────

async def analyze_audio(audio_path: str) -> dict:
    """
    Async wrapper — runs the blocking Gemini calls in a thread pool
    so the FastAPI event loop stays responsive during the (often 20-40s) API call.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        partial(_upload_and_analyze, audio_path, _model()),
    )
