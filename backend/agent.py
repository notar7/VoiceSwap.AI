"""
VoiceSwap ADK Agent
===================
Wraps the pipeline as a Google ADK (Agent Development Kit) agent so Gemini
orchestrates each step — analyze → synthesize → merge — via tool calls.

This satisfies the mandatory ADK requirement for the "Live Agents" track.

Tools:
  1. analyze_audio_tool    — sends WAV to Gemini 2.5 Flash (transcription + emotion + voice direction)
  2. synthesize_voice_tool — builds expressive SSML + calls Google Cloud TTS
  3. merge_video_tool      — replaces original audio in the video via ffmpeg

The agent (not application code) decides the call order using Gemini's reasoning.
"""

import asyncio
import json
import os
import uuid
import concurrent.futures
from pathlib import Path
from functools import partial

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from dotenv import load_dotenv

from services.ffmpeg import merge_audio_video
from services.gemini import analyze_audio as _analyze_audio_async
from services.tts import synthesize_voice as _synthesize_voice_async
from utils.file_handler import get_job_dir, job_exists
from utils.ssml_builder import build_ssml

load_dotenv()


# ── Async → sync bridge ───────────────────────────────────────────────────────
# ADK tool functions must be synchronous. Our pipeline services are async.
# We run them in a fresh thread with its own event loop to avoid conflicts
# with FastAPI's event loop (which may or may not be running in the caller).

def _sync(coro):
    """Run an async coroutine synchronously, safe from any calling context."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result()


# ── Tool 1: Gemini audio analysis ─────────────────────────────────────────────

def analyze_audio_tool(job_id: str) -> dict:
    """
    Analyze the uploaded video's audio using Gemini 2.5 Flash.

    Gemini performs THREE roles in one API call:
      - Transcription: full text with word-level timestamps
      - Emotion Analysis: tone, pace, energy, emphasis detection
      - Voice Direction: structured SSML hints for the TTS synthesizer

    Returns a summary of the analysis. Full data is saved to analysis.json
    in the job directory for the next pipeline steps.
    """
    if not job_exists(job_id):
        return {"error": f"Job '{job_id}' not found. Ensure the video was uploaded first."}

    job_dir = get_job_dir(job_id)
    audio_path = str(job_dir / "audio.wav")
    analysis_path = job_dir / "analysis.json"

    if not Path(audio_path).exists():
        return {"error": "Audio file not found. Ensure the upload completed successfully."}

    # Use cached analysis if already done (e.g. /analyze was already called)
    if analysis_path.exists():
        with open(analysis_path) as f:
            cached = json.load(f)
        return {
            "status": "analyzed",
            "cached": True,
            "transcript_preview": cached["transcript"].get("transcript", "")[:200],
            "overall_tone": cached["voice_direction"].get("overall_tone", ""),
            "pace": cached["voice_direction"].get("pace", ""),
            "energy": cached["voice_direction"].get("energy", ""),
            "ssml_hints": cached["voice_direction"].get("ssml_hints", ""),
        }

    try:
        result = _sync(_analyze_audio_async(audio_path))
    except Exception as e:
        return {"error": f"Gemini analysis failed: {e}"}

    # Persist to disk so synthesize_voice_tool can read it
    with open(analysis_path, "w") as f:
        json.dump(result, f, indent=2)

    return {
        "status": "analyzed",
        "transcript_preview": result["transcript"].get("transcript", "")[:200],
        "overall_tone": result["voice_direction"].get("overall_tone", ""),
        "pace": result["voice_direction"].get("pace", ""),
        "energy": result["voice_direction"].get("energy", ""),
        "ssml_hints": result["voice_direction"].get("ssml_hints", ""),
    }


# ── Tool 2: Google Cloud TTS synthesis ────────────────────────────────────────

def synthesize_voice_tool(job_id: str, voice_id: str) -> dict:
    """
    Synthesize a new voice using Google Cloud TTS.

    Uses Gemini's voice direction JSON (from analyze_audio_tool) to build
    expressive SSML — making the synthesized voice match the original speech's
    emotion, pace, and emphasis. Different voice, same soul.

    Saves the synthesized audio to new_audio.mp3 in the job directory.
    """
    if not job_exists(job_id):
        return {"error": f"Job '{job_id}' not found."}

    job_dir = get_job_dir(job_id)
    analysis_path = job_dir / "analysis.json"

    if not analysis_path.exists():
        return {"error": "Analysis not found. Run analyze_audio_tool first."}

    with open(analysis_path) as f:
        analysis = json.load(f)

    transcript_text = analysis["transcript"].get("transcript", "")
    voice_direction = analysis["voice_direction"]

    if not transcript_text:
        return {"error": "Transcript is empty — cannot synthesize voice."}

    # Build SSML using Gemini's expressive voice direction
    ssml = build_ssml(transcript_text, voice_direction)
    audio_output = str(job_dir / "new_audio.mp3")

    try:
        _sync(_synthesize_voice_async(ssml, voice_id, audio_output))
    except Exception as e:
        return {"error": f"Google Cloud TTS synthesis failed: {e}"}

    return {
        "status": "synthesized",
        "voice_id": voice_id,
        "audio_path": audio_output,
        "message": f"Voice '{voice_id}' synthesized successfully with expressive SSML.",
    }


# ── Tool 3: ffmpeg video merge ────────────────────────────────────────────────

def merge_video_tool(job_id: str) -> dict:
    """
    Merge the synthesized audio back into the original video using ffmpeg.

    Replaces the original audio track without re-encoding the video stream
    (ffmpeg -c:v copy), keeping the process fast and lossless for video quality.

    Returns the download URL for the final output.mp4.
    """
    if not job_exists(job_id):
        return {"error": f"Job '{job_id}' not found."}

    job_dir = get_job_dir(job_id)
    video_path = str(job_dir / "input.mp4")
    audio_path = str(job_dir / "new_audio.mp3")
    output_path = str(job_dir / "output.mp4")

    if not Path(audio_path).exists():
        return {"error": "Synthesized audio not found. Run synthesize_voice_tool first."}

    if not Path(video_path).exists():
        return {"error": "Original video not found. Ensure upload completed."}

    try:
        _sync(merge_audio_video(video_path, audio_path, output_path))
    except Exception as e:
        return {"error": f"ffmpeg video merge failed: {e}"}

    return {
        "status": "merged",
        "download_url": f"/download/{job_id}",
        "original_url": f"/original/{job_id}",
        "message": "Pipeline complete! New voice has been merged into your video.",
    }


# ── Agent Definition ──────────────────────────────────────────────────────────

AGENT_INSTRUCTION = """
You are VoiceSwap's AI Voice Director Agent — an intelligent orchestrator
that replaces the voice in a video while preserving the original emotional
character of the speech.

When given a job_id and voice_id, execute the pipeline by calling tools
in this EXACT order:

  Step 1 → analyze_audio_tool(job_id)
      Gemini 2.5 Flash analyzes the audio: transcription, emotion, tone,
      pace, energy, and generates expressive SSML hints.

  Step 2 → synthesize_voice_tool(job_id, voice_id)
      Google Cloud TTS synthesizes the transcript using Gemini's SSML
      voice direction — same words, same soul, new voice.

  Step 3 → merge_video_tool(job_id)
      ffmpeg replaces the original audio track with the synthesized voice.
      Returns the download URL for the completed video.

If any tool returns an "error" field, stop immediately and report the error.
After all three steps succeed, confirm completion and provide the download_url.
""".strip()

voiceswap_agent = Agent(
    name="voiceswap_agent",
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    description=(
        "AI Voice Director Agent — orchestrates the VoiceSwap pipeline: "
        "Gemini analysis → Google Cloud TTS synthesis → ffmpeg video merge."
    ),
    instruction=AGENT_INSTRUCTION,
    tools=[analyze_audio_tool, synthesize_voice_tool, merge_video_tool],
)


# ── Session service (shared across requests) ──────────────────────────────────

_session_service = InMemorySessionService()
APP_NAME = "voiceswap"


# ── Public runner ─────────────────────────────────────────────────────────────

def run_pipeline_agent(job_id: str, voice_id: str) -> str:
    """
    Run the VoiceSwap ADK agent synchronously for a given job.

    Called from FastAPI's /run-agent/{job_id} endpoint via run_in_executor
    so it doesn't block the async event loop.

    Returns the final text response from the agent (includes status + download URL).
    """
    session_id = str(uuid.uuid4())
    user_id = f"job_{job_id}"

    # auto_create_session=True lets the runner create the session internally,
    # avoiding the need to await the async create_session() call from sync context.
    runner = Runner(
        agent=voiceswap_agent,
        app_name=APP_NAME,
        session_service=_session_service,
        auto_create_session=True,
    )

    message = genai_types.Content(
        role="user",
        parts=[
            genai_types.Part(
                text=(
                    f"Process job_id='{job_id}' with voice_id='{voice_id}'. "
                    "Run the full pipeline by calling all three tools in order: "
                    "analyze_audio_tool, then synthesize_voice_tool, then merge_video_tool."
                )
            )
        ],
    )

    final_response = ""
    for event in runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=message,
    ):
        if event.is_final_response():
            # ADK 1.x: text lives in event.content.parts, not event.response
            if event.content and event.content.parts:
                for part in event.content.parts:
                    text = getattr(part, "text", None)
                    if text:
                        final_response += text

    return final_response or "Pipeline completed successfully."
