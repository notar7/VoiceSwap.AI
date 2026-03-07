from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from dotenv import load_dotenv
import os
import json
import shutil

from models.schemas import (
    UploadResponse, AnalysisResponse, TranscriptResponse,
    VoiceDirectionResponse, WordTimestamp, EmotionSegment,
    VoiceListResponse, Voice, PreviewVoiceRequest,
    SynthesizeRequest, SynthesizeResponse, MergeResponse,
)
from utils.file_handler import create_job_dir, new_job_id, get_job_dir, job_exists
from utils.ssml_builder import build_ssml
from services.ffmpeg import extract_audio, get_video_duration, check_ffmpeg, merge_audio_video
from services.gemini import analyze_audio
from services.tts import preview_voice, synthesize_voice

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="VoiceSwap.AI API",
    description="VoiceSwap.AI — Swap the voice. Keep the soul. AI-powered voice replacement pipeline using Gemini 2.5 Flash + Google TTS.",
    version="0.2.0",
)

# Allow requests from the Next.js frontend during local dev and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}
MAX_DURATION_SECONDS = 120  # 2 minutes per PRD


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "message": "VoiceSwap API is running 🎙️"}


@app.get("/health")
async def health():
    """Detailed health check including ffmpeg and API key status."""
    return {
        "status": "healthy",
        "ffmpeg_available": check_ffmpeg(),
        "gemini_key_set": bool(os.getenv("GEMINI_API_KEY")),
        "gcp_creds_set": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
    }


# ── Phase 1: Upload ───────────────────────────────────────────────────────────

@app.post("/upload", response_model=UploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """
    Accept a video upload, save it, extract the audio track.

    Flow:
      1. Validate file type
      2. Save to ./tmp/{job_id}/input.mp4
      3. Get video duration via ffprobe
      4. Run ffmpeg to extract audio as WAV
      5. Return job_id + duration
    """
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Only MP4 and MOV are accepted.",
        )

    job_id = new_job_id()
    job_dir = create_job_dir(job_id)
    video_path = str(job_dir / "input.mp4")

    try:
        with open(video_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        await file.close()

    duration = await get_video_duration(video_path)

    if duration > MAX_DURATION_SECONDS:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail=f"Video is {duration:.0f}s long. Maximum is {MAX_DURATION_SECONDS}s (2 minutes).",
        )

    audio_path = str(job_dir / "audio.wav")
    try:
        await extract_audio(video_path, audio_path)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {e}")

    return UploadResponse(
        job_id=job_id,
        filename=file.filename or "input.mp4",
        status="audio_extracted",
        duration=round(duration, 2),
    )


# ── Phase 2: Analyze with Gemini ──────────────────────────────────────────────

@app.post("/analyze/{job_id}", response_model=AnalysisResponse)
async def analyze_video(job_id: str):
    """
    Send the extracted audio to Gemini 2.0 Flash for:
      1. Transcription — full text with word-level timestamps
      2. Emotion Analysis — tone, pace, energy, emphasis words
      3. Voice Direction — SSML hints for the TTS synthesizer

    Gemini is the AI brain here, not just a transcriber.
    The voice_direction JSON is what makes the final voice emotionally accurate.
    """
    if not job_exists(job_id):
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    job_dir = get_job_dir(job_id)
    audio_path = str(job_dir / "audio.wav")

    if not (job_dir / "audio.wav").exists():
        raise HTTPException(
            status_code=400,
            detail="Audio not yet extracted. Call /upload first.",
        )

    try:
        result = await analyze_audio(audio_path)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        # Gemini returned unparseable JSON
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {e}")

    # ── Shape the response into Pydantic models ───────────────────────────────
    raw_transcript = result["transcript"]
    raw_direction = result["voice_direction"]

    transcript = TranscriptResponse(
        transcript=raw_transcript.get("transcript", ""),
        words=[
            WordTimestamp(**w)
            for w in raw_transcript.get("words", [])
            if isinstance(w, dict) and "word" in w
        ],
        total_duration=float(raw_transcript.get("total_duration", 0)),
    )

    voice_direction = VoiceDirectionResponse(
        overall_tone=raw_direction.get("overall_tone", ""),
        pace=raw_direction.get("pace", "moderate"),
        energy=raw_direction.get("energy", "medium"),
        emphasis_words=raw_direction.get("emphasis_words", []),
        emotion_segments=[
            EmotionSegment(**seg)
            for seg in raw_direction.get("emotion_segments", [])
            if isinstance(seg, dict)
        ],
        ssml_hints=raw_direction.get("ssml_hints", ""),
    )

    # ── Persist analysis to disk so /synthesize can read it ─────────────────
    # We don't have a database, so analysis.json is our source of truth.
    analysis_path = job_dir / "analysis.json"
    with open(analysis_path, "w") as f:
        json.dump({"transcript": raw_transcript, "voice_direction": raw_direction}, f)

    return AnalysisResponse(
        job_id=job_id,
        transcript=transcript,
        voice_direction=voice_direction,
        status="analyzed",
    )

# ── Phase 3: Voice Library ────────────────────────────────────────────────────

# Preset voice library — hardcoded as per PRD.
# Named voices make the UI feel like a real product (not just IDs).
VOICES = [
    Voice(id="en-US-Neural2-D", name="Atlas",   gender="Male",   accent="American"),
    Voice(id="en-US-Neural2-F", name="Nova",    gender="Female", accent="American"),
    Voice(id="en-GB-Neural2-B", name="Sterling", gender="Male",   accent="British"),
    Voice(id="en-GB-Neural2-C", name="Ivy",     gender="Female", accent="British"),
    Voice(id="en-IN-Neural2-B", name="Arjun",   gender="Male",   accent="Indian"),
    Voice(id="en-IN-Neural2-A", name="Priya",   gender="Female", accent="Indian"),
]


@app.get("/voices", response_model=VoiceListResponse)
async def get_voices():
    """Return the preset voice library. No auth, no dependencies — fast."""
    return VoiceListResponse(voices=VOICES)


@app.post("/preview-voice")
async def preview_voice_endpoint(body: PreviewVoiceRequest):
    """
    Generate a short MP3 audio preview for the selected voice.
    Returns raw MP3 bytes so the frontend can play it directly.

    Requires Google Cloud TTS credentials (GOOGLE_APPLICATION_CREDENTIALS in .env).
    Returns 503 if credentials are not configured — frontend falls back to browser TTS.
    """
    # Validate that the requested voice_id exists in our library
    valid_ids = {v.id for v in VOICES}
    if body.voice_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Unknown voice ID: {body.voice_id}")

    try:
        audio_bytes = await preview_voice(body.voice_id, body.sample_text)
    except RuntimeError as e:
        # GCP credentials not configured — frontend will use browser TTS fallback
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice preview failed: {e}")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=preview.mp3"},
    )

# ── Phase 4: Synthesis + Merge ──────────────────────────────────────────────

@app.post("/synthesize/{job_id}", response_model=SynthesizeResponse)
async def synthesize_endpoint(job_id: str, body: SynthesizeRequest):
    """
    Build SSML from Gemini's voice direction JSON, then call Google TTS
    to synthesize the new voice. Saves new_audio.mp3 in the job directory.

    This is where Gemini's analysis becomes audible — the emotion JSON
    directly shapes the SSML, which makes the synthesized voice expressive.
    """
    if not job_exists(job_id):
        raise HTTPException(404, detail=f"Job '{job_id}' not found.")

    job_dir = get_job_dir(job_id)
    analysis_path = job_dir / "analysis.json"

    if not analysis_path.exists():
        raise HTTPException(400, detail="Analysis not found. Run /analyze first.")

    with open(analysis_path) as f:
        analysis = json.load(f)

    transcript_text = analysis["transcript"].get("transcript", "")
    voice_direction = analysis["voice_direction"]

    if not transcript_text:
        raise HTTPException(400, detail="Transcript is empty — cannot synthesize.")

    # Build SSML using Gemini's voice direction
    ssml = build_ssml(transcript_text, voice_direction)

    audio_output = str(job_dir / "new_audio.mp3")
    try:
        await synthesize_voice(ssml, body.voice_id, audio_output)
    except RuntimeError as e:
        raise HTTPException(503, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Synthesis failed: {e}")

    return SynthesizeResponse(
        job_id=job_id,
        status="synthesized",
        audio_path=audio_output,
    )


@app.post("/merge/{job_id}", response_model=MergeResponse)
async def merge_endpoint(job_id: str):
    """
    Replace the original video's audio track with the synthesized MP3.
    Uses ffmpeg -c:v copy so the video stream is not re-encoded — fast.
    Returns a download URL for the output.mp4.
    """
    if not job_exists(job_id):
        raise HTTPException(404, detail=f"Job '{job_id}' not found.")

    job_dir = get_job_dir(job_id)
    video_path = str(job_dir / "input.mp4")
    audio_path = str(job_dir / "new_audio.mp3")
    output_path = str(job_dir / "output.mp4")

    if not (job_dir / "new_audio.mp3").exists():
        raise HTTPException(400, detail="Synthesized audio not found. Run /synthesize first.")

    if not (job_dir / "input.mp4").exists():
        raise HTTPException(400, detail="Original video not found.")

    try:
        await merge_audio_video(video_path, audio_path, output_path)
    except RuntimeError as e:
        raise HTTPException(500, detail=f"Merge failed: {e}")

    return MergeResponse(
        job_id=job_id,
        status="merged",
        download_url=f"/download/{job_id}",
    )


@app.get("/download/{job_id}")
async def download_endpoint(job_id: str):
    """
    Serve the final output.mp4 for download.
    The frontend hits this URL after merge completes.
    """
    if not job_exists(job_id):
        raise HTTPException(404, detail=f"Job '{job_id}' not found.")

    output_path = get_job_dir(job_id) / "output.mp4"

    if not output_path.exists():
        raise HTTPException(404, detail="Output video not ready. Run /merge first.")

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename="voiceswap_output.mp4",
    )


@app.get("/original/{job_id}")
async def original_endpoint(job_id: str):
    """
    Serve the original input.mp4 for Before/After comparison in the result screen.
    Used by BeforeAfterPlayer on the frontend so users can compare
    the original voice against the VoiceSwap.AI output side-by-side.
    """
    if not job_exists(job_id):
        raise HTTPException(404, detail=f"Job '{job_id}' not found.")

    original_path = get_job_dir(job_id) / "input.mp4"

    if not original_path.exists():
        raise HTTPException(404, detail="Original video not found for this job.")

    return FileResponse(
        path=str(original_path),
        media_type="video/mp4",
        filename="original_input.mp4",
    )
