"""
Pydantic schemas for all API request and response models.
Keeping schemas in one file makes it easy to understand the full API contract at a glance.
"""

from pydantic import BaseModel
from typing import Optional, List


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    job_id: str
    filename: str
    status: str  # e.g. "uploaded" | "audio_extracted"
    duration: Optional[float] = None  # video duration in seconds


# ── Gemini Analysis ───────────────────────────────────────────────────────────

class WordTimestamp(BaseModel):
    word: str
    start_time: float
    end_time: float


class TranscriptResponse(BaseModel):
    transcript: str
    words: List[WordTimestamp]
    total_duration: float


class EmotionSegment(BaseModel):
    start_time: float
    end_time: float
    emotion: str
    suggested_pitch: str  # "low" | "medium" | "high"


class VoiceDirectionResponse(BaseModel):
    overall_tone: str
    pace: str           # "slow" | "moderate" | "fast"
    energy: str         # "low" | "medium" | "high"
    emphasis_words: List[str]
    emotion_segments: List[EmotionSegment]
    ssml_hints: str


class AnalysisResponse(BaseModel):
    job_id: str
    transcript: TranscriptResponse
    voice_direction: VoiceDirectionResponse
    status: str


# ── Voice Library ─────────────────────────────────────────────────────────────

class Voice(BaseModel):
    id: str           # Google TTS voice ID, e.g. "en-US-Neural2-D"
    name: str         # Friendly name, e.g. "Atlas"
    gender: str       # "Male" | "Female"
    accent: str       # "American" | "British" | "Indian"


class VoiceListResponse(BaseModel):
    voices: List[Voice]


class PreviewVoiceRequest(BaseModel):
    voice_id: str
    sample_text: str = "Hello, I'm your new AI voice. How does this sound to you?"



# ── Synthesis & Merge ─────────────────────────────────────────────────────────

class SynthesizeRequest(BaseModel):
    voice_id: str


class SynthesizeResponse(BaseModel):
    job_id: str
    status: str
    audio_path: Optional[str] = None


class MergeResponse(BaseModel):
    job_id: str
    status: str
    download_url: str  # URL to the final output.mp4
