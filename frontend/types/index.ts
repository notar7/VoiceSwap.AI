/**
 * Shared TypeScript types for the VoiceSwap frontend.
 * These mirror the Pydantic schemas in backend/models/schemas.py.
 */

// ── Voice Library ─────────────────────────────────────────────────────────────

export interface Voice {
    id: string;       // Google TTS voice ID, e.g. "en-US-Neural2-D"
    name: string;     // Friendly name, e.g. "Atlas"
    gender: "Male" | "Female";
    accent: string;   // "American" | "British" | "Indian"
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResponse {
    job_id: string;
    filename: string;
    status: string;
    duration?: number; // seconds
}

// ── Gemini Analysis ───────────────────────────────────────────────────────────

export interface WordTimestamp {
    word: string;
    start_time: number;
    end_time: number;
}

export interface TranscriptData {
    transcript: string;
    words: WordTimestamp[];
    total_duration: number;
}

export interface EmotionSegment {
    start_time: number;
    end_time: number;
    emotion: string;
    suggested_pitch: "low" | "medium" | "high";
}

export interface VoiceDirection {
    overall_tone: string;
    pace: "slow" | "moderate" | "fast";
    energy: "low" | "medium" | "high";
    emphasis_words: string[];
    emotion_segments: EmotionSegment[];
    ssml_hints: string;
}

export interface AnalysisResponse {
    job_id: string;
    transcript: TranscriptData;
    voice_direction: VoiceDirection;
    status: string;
}

// ── Processing Pipeline ───────────────────────────────────────────────────────

export type StepStatus = "pending" | "in_progress" | "done" | "error";

export interface ProcessingStep {
    id: string;
    label: string;
    status: StepStatus;
}
