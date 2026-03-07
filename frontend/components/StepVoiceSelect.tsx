"use client";

/**
 * StepVoiceSelect — Step 3 of the studio pipeline.
 * Three-column layout:
 *   Left  — Voice Direction JSON from Gemini (styled code block)
 *   Middle — Transcript JSON (styled code block)
 *   Right  — 2×3 voice tile grid with preview + Apply Voice button
 *
 * Preview logic preserved from VoiceSelector:
 *   1. Try Google TTS /preview-voice endpoint
 *   2. Fall back to browser SpeechSynthesis on 503
 */

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Play, Square, Loader2 } from "lucide-react";
import type { AnalysisResponse, Voice } from "@/types";

interface StepVoiceSelectProps {
  analysis: AnalysisResponse;
  voices: Voice[];
  onApplyVoice: (voiceId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCENT_FLAG: Record<string, string> = {
  American: "🇺🇸",
  British:  "🇬🇧",
  Indian:   "🇮🇳",
};

const SAMPLE_TEXT = "Hello, I'm your new AI voice. How does this sound?";

export function StepVoiceSelect({ analysis, voices, onApplyVoice }: StepVoiceSelectProps) {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [playingId, setPlayingId]     = useState<string | null>(null);
  const [loadingId, setLoadingId]     = useState<string | null>(null);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const ttsAvailable   = useRef(true);

  const stopCurrent = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setPlayingId(null);
  }, []);

  const playPreview = useCallback(
    async (voice: Voice) => {
      if (playingId === voice.id) { stopCurrent(); return; }
      stopCurrent();
      setLoadingId(voice.id);

      try {
        if (ttsAvailable.current) {
          const res = await fetch(`${API_BASE}/preview-voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice_id: voice.id, sample_text: SAMPLE_TEXT }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            setLoadingId(null);
            setPlayingId(voice.id);
            audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
            audio.play();
            return;
          }
          // 503 = TTS not configured — skip backend on future clicks
          ttsAvailable.current = false;
        }
      } catch { /* fall through to browser TTS */ }

      // Browser SpeechSynthesis fallback
      setLoadingId(null);
      setPlayingId(voice.id);
      const utterance  = new SpeechSynthesisUtterance(SAMPLE_TEXT);
      utterance.lang   = ({ American: "en-US", British: "en-GB", Indian: "en-IN" } as Record<string, string>)[voice.accent] ?? "en-US";
      utterance.rate   = 0.95;
      utterance.onend  = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    },
    [playingId, stopCurrent]
  );

  return (
    <div className="w-full flex gap-4 h-[calc(100vh-220px)] min-h-[520px]">

      {/* ── LEFT: Voice Direction JSON ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm">Voice Direction</h3>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[10px] font-semibold tracking-wide">
            GEMINI
          </span>
        </div>
        <div className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#070707] p-4 overflow-y-auto">
          <pre className="text-xs text-indigo-300/80 leading-relaxed font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(analysis.voice_direction, null, 2)}
          </pre>
        </div>
        <p className="text-[10px] text-[#2a2a2a] uppercase tracking-widest font-medium flex-shrink-0">
          Used to build SSML for Google TTS
        </p>
      </div>

      {/* ── MIDDLE: Transcript JSON ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm">Transcript</h3>
          <span className="px-2 py-0.5 rounded-full bg-[#111] border border-[#1e1e1e] text-[#444] text-[10px] font-medium">
            {analysis.transcript.total_duration.toFixed(1)}s
          </span>
        </div>
        <div className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#070707] p-4 overflow-y-auto">
          <pre className="text-xs text-green-400/70 leading-relaxed font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(analysis.transcript, null, 2)}
          </pre>
        </div>
        <p className="text-[10px] text-[#2a2a2a] uppercase tracking-widest font-medium flex-shrink-0">
          Word-level timestamps from Gemini
        </p>
      </div>

      {/* ── RIGHT: Voice grid ──────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-3">
        <h3 className="text-white font-semibold text-sm flex-shrink-0">Select a Voice</h3>

        <div className="grid grid-cols-2 gap-2.5 overflow-y-auto">
          {voices.map((voice, i) => {
            const isSelected = selectedId  === voice.id;
            const isPlaying  = playingId   === voice.id;
            const isLoading  = loadingId   === voice.id;

            return (
              <motion.div
                key={voice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedId(voice.id)}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer
                  transition-all duration-200 select-none
                  ${isSelected
                    ? "border-indigo-500 bg-indigo-500/[0.07] shadow-[0_0_20px_rgba(99,102,241,0.13)]"
                    : "border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#282828] hover:bg-[#0f0f0f]"
                  }
                `}
              >
                {/* Selected indicator dot */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500"
                  />
                )}

                {/* Avatar circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border
                    ${isSelected ? "bg-indigo-600/15 border-indigo-500/30" : "bg-[#111] border-[#1a1a1a]"}
                  `}
                >
                  <User className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-[#444]"}`} />
                </div>

                {/* Name + accent */}
                <div className="text-center">
                  <p className={`text-xs font-semibold ${isSelected ? "text-white" : "text-[#777]"}`}>
                    {voice.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-[11px]">{ACCENT_FLAG[voice.accent]}</span>
                    <span className="text-[#333] text-[10px]">{voice.accent}</span>
                  </div>
                </div>

                {/* Preview button */}
                <button
                  id={`play-voice-${voice.id}`}
                  onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                  className={`
                    flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[10px]
                    font-medium border transition-all
                    ${isPlaying
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                      : "border-[#1a1a1a] bg-[#111] text-[#444] hover:text-[#777]"
                    }
                  `}
                >
                  {isLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                      <Loader2 className="w-3 h-3" />
                    </motion.div>
                  ) : isPlaying ? (
                    <><Square className="w-2.5 h-2.5" /> Stop</>
                  ) : (
                    <><Play className="w-2.5 h-2.5" /> Preview</>
                  )}
                </button>

                {/* Apply Voice button — only on selected card */}
                {isSelected && (
                  <motion.button
                    id="apply-voice-btn"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => { e.stopPropagation(); onApplyVoice(voice.id); }}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  >
                    Apply Voice →
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
