/**
 * All backend API calls live here — never scattered in components.
 * Each function maps 1:1 to a backend endpoint.
 */

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Upload ───────────────────────────────────────────────────────────────────

export async function uploadVideo(file: File): Promise<{ job_id: string; filename: string; status: string; duration?: number }> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Upload failed");
    }

    return res.json();
}

// ── Analysis (Gemini) ────────────────────────────────────────────────────────

export async function analyzeVideo(jobId: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}/analyze/${jobId}`, { method: "POST" });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Analysis failed");
    }

    return res.json();
}

// ── Voice Library ────────────────────────────────────────────────────────────

export async function getVoices(): Promise<{ voices: unknown[] }> {
    const res = await fetch(`${API_BASE}/voices`);

    if (!res.ok) throw new Error("Failed to fetch voices");

    return res.json();
}

export async function previewVoice(voiceId: string, sampleText: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/preview-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId, sample_text: sampleText }),
    });

    if (!res.ok) throw new Error("Voice preview failed");

    return res.blob(); // audio blob for <audio> element
}

// ── Synthesis & Merge ────────────────────────────────────────────────────────

export async function synthesizeVoice(jobId: string, voiceId: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}/synthesize/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId }),
    });

    if (!res.ok) throw new Error("Synthesis failed");

    return res.json();
}

export async function mergeVideo(jobId: string): Promise<{ download_url: string }> {
    const res = await fetch(`${API_BASE}/merge/${jobId}`, { method: "POST" });

    if (!res.ok) throw new Error("Merge failed");

    return res.json();
}
