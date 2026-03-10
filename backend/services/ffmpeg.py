"""
ffmpeg service — wraps all ffmpeg shell operations.
Keeps subprocess calls in one place so the rest of the codebase stays clean.

NOTE on Windows + asyncio:
  asyncio.create_subprocess_exec requires ProactorEventLoop on Windows.
  Rather than force a loop policy change globally, we run ffmpeg in a thread
  pool executor using the standard blocking subprocess — this is safe because
  ffmpeg calls are short-lived I/O operations, not CPU-bound work.
"""

import asyncio
import subprocess
import json
from functools import partial
from pathlib import Path


def _run(cmd: list[str]) -> tuple[int, str, str]:
    """Run a shell command synchronously, return (returncode, stdout, stderr)."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout, result.stderr


async def _run_async(cmd: list[str]) -> tuple[int, str, str]:
    """Run a blocking subprocess in a thread pool so the event loop stays free."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_run, cmd))


async def extract_audio(video_path: str, audio_output_path: str) -> None:
    """
    Extract the audio track from a video file as a 16-bit mono WAV.
    WAV is used (not MP3) because Gemini processes lossless audio more accurately.
    Command: ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ac 1 audio.wav
    """
    cmd = [
        "ffmpeg",
        "-y",                   # overwrite output without asking
        "-i", video_path,
        "-vn",                  # no video stream
        "-acodec", "pcm_s16le", # 16-bit PCM — lossless, Gemini-compatible
        "-ac", "1",             # mono — reduces size without losing speech clarity
        audio_output_path,
    ]
    returncode, _, stderr = await _run_async(cmd)

    if returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed:\n{stderr}")


async def get_video_duration(video_path: str) -> float:
    """
    Use ffprobe to get the exact duration of the video in seconds.
    Returns 0.0 if ffprobe fails (graceful fallback).
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        video_path,
    ]
    returncode, stdout, _ = await _run_async(cmd)

    if returncode != 0:
        return 0.0

    try:
        info = json.loads(stdout)
        return float(info["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return 0.0


async def get_audio_duration(audio_path: str) -> float:
    """Use ffprobe to get duration of any audio file in seconds."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        audio_path,
    ]
    returncode, stdout, _ = await _run_async(cmd)
    if returncode != 0:
        return 0.0
    try:
        info = json.loads(stdout)
        return float(info["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return 0.0


def _build_atempo_filter(rate: float) -> str:
    """
    Build an ffmpeg atempo filter chain for the given playback rate.
    atempo is constrained to [0.5, 2.0] per stage — chain stages for
    values outside that range.

    rate > 1.0 → speed up (audio is too long).
    rate < 1.0 → slow down (audio is too short).
    """
    # Clamp to a range that still sounds like natural speech
    rate = max(0.5, min(rate, 2.0))

    stages: list[str] = []
    remaining = rate

    # Build chain for speed-up
    while remaining > 2.0:
        stages.append("atempo=2.0")
        remaining /= 2.0
    # Build chain for slow-down
    while remaining < 0.5:
        stages.append("atempo=0.5")
        remaining /= 0.5

    stages.append(f"atempo={remaining:.6f}")
    return ",".join(stages)


async def stretch_audio_to_duration(
    audio_path: str,
    target_duration: float,
    output_path: str,
) -> str:
    """
    Time-stretch audio so it matches target_duration exactly.
    Uses ffmpeg atempo filter — pitch-preserving tempo adjustment.
    Returns output_path on success, original audio_path on failure.

    Skips stretching if audio is already within 2% of the target
    (imperceptible difference).
    """
    audio_dur = await get_audio_duration(audio_path)
    if audio_dur <= 0 or target_duration <= 0:
        return audio_path

    # rate = how much faster/slower to play the audio
    # rate = audio_dur / target_duration:
    #   audio 40s → target 30s → rate=1.33 (speed up)
    #   audio 20s → target 30s → rate=0.67 (slow down)
    rate = audio_dur / target_duration

    if abs(rate - 1.0) < 0.02:   # within 2% — skip
        return audio_path

    atempo = _build_atempo_filter(rate)
    cmd = [
        "ffmpeg", "-y",
        "-i", audio_path,
        "-filter:a", atempo,
        "-acodec", "libmp3lame",
        "-q:a", "2",            # VBR quality ~190 kbps — transparent
        output_path,
    ]
    returncode, _, stderr = await _run_async(cmd)
    if returncode != 0:
        # Stretch failed — fall back to original audio (still produces output)
        print(f"[ffmpeg] atempo stretch failed, using original audio: {stderr[:200]}")
        return audio_path
    return output_path


async def merge_audio_video(
    video_path: str, audio_path: str, output_path: str
) -> None:
    """
    Replace the original video's audio track with newly synthesized audio.

    AUTO-SYNC: The synthesized audio is time-stretched via ffmpeg atempo to
    exactly match the video duration before merging.  This ensures the new
    voice always fits the visuals regardless of TTS speaking rate.

    -c:v copy skips video re-encoding — very fast.
    """
    # ── Step 1: get durations ───────────────────────────────────────────────
    video_dur = await get_video_duration(video_path)

    merged_audio = audio_path
    if video_dur > 0:
        # Stretch audio to match video duration exactly
        stretched_path = audio_path.replace(".mp3", "_sync.mp3")
        merged_audio = await stretch_audio_to_duration(
            audio_path, video_dur, stretched_path
        )

    # ── Step 2: merge ──────────────────────────────────────────────────────
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-i", merged_audio,
        "-c:v", "copy",       # copy video stream without re-encoding
        "-map", "0:v:0",      # take video from first input
        "-map", "1:a:0",      # take audio from second input
        output_path,
    ]
    returncode, _, stderr = await _run_async(cmd)
    if returncode != 0:
        raise RuntimeError(f"ffmpeg merge failed:\n{stderr}")


def check_ffmpeg() -> bool:
    """Return True if ffmpeg is available on PATH — used for startup health checks."""
    returncode, _, _ = _run(["ffmpeg", "-version"])
    return returncode == 0
