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


async def merge_audio_video(
    video_path: str, audio_path: str, output_path: str
) -> None:
    """
    Replace the original video's audio track with newly synthesized audio.
    -c:v copy skips video re-encoding — very fast.
    Command: ffmpeg -i input.mp4 -i new_audio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 output.mp4
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",       # copy video stream without re-encoding
        "-map", "0:v:0",      # take video from first input
        "-map", "1:a:0",      # take audio from second input
        "-shortest",          # trim to shortest stream if lengths differ
        output_path,
    ]
    returncode, _, stderr = await _run_async(cmd)
    if returncode != 0:
        raise RuntimeError(f"ffmpeg merge failed:\n{stderr}")


def check_ffmpeg() -> bool:
    """Return True if ffmpeg is available on PATH — used for startup health checks."""
    returncode, _, _ = _run(["ffmpeg", "-version"])
    return returncode == 0
