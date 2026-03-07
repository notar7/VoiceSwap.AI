"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Voice } from "@/types";

interface VoiceSelectorProps {
    voices: Voice[];
    selectedVoiceId: string | null;
    onSelect: (voiceId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const GENDER_ICON: Record<string, string> = {
    Male: "♂",
    Female: "♀",
};

const ACCENT_FLAG: Record<string, string> = {
    American: "🇺🇸",
    British: "🇬🇧",
    Indian: "🇮🇳",
};

const SAMPLE_TEXT = "Hello, I'm your new AI voice. How does this sound to you?";

export function VoiceSelector({ voices, selectedVoiceId, onSelect }: VoiceSelectorProps) {
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // After first 503 we skip backend and go straight to browser TTS
    const ttsAvailable = useRef<boolean>(true);

    // Stop any playing audio when component unmounts
    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            window.speechSynthesis?.cancel();
        };
    }, []);

    const stopCurrent = useCallback(() => {
        audioRef.current?.pause();
        audioRef.current = null;
        window.speechSynthesis?.cancel();
        setPlayingId(null);
    }, []);

    const playPreview = useCallback(
        async (voice: Voice) => {
            // Toggle off if already playing this voice
            if (playingId === voice.id) {
                stopCurrent();
                return;
            }

            stopCurrent();
            setLoadingId(voice.id);

            try {
                // ── Try backend Google TTS preview first (skip if known unavailable) ──
                if (ttsAvailable.current) {
                    const res = await fetch(`${API_BASE}/preview-voice`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ voice_id: voice.id, sample_text: SAMPLE_TEXT }),
                    });

                    if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio(url);
                        audioRef.current = audio;
                        setLoadingId(null);
                        setPlayingId(voice.id);
                        audio.onended = () => {
                            setPlayingId(null);
                            URL.revokeObjectURL(url);
                        };
                        audio.play();
                        return;
                    } else {
                        // 503 = TTS not set up — don't retry on future clicks
                        ttsAvailable.current = false;
                    }
                }
            } catch {
                // Network error — fall through to browser TTS
            }

            // ── Fallback: browser SpeechSynthesis ────────────────────────────────
            // Used when GCP credentials aren't set up yet.
            // Picks the closest available browser voice based on accent.
            setLoadingId(null);
            setPlayingId(voice.id);

            const utterance = new SpeechSynthesisUtterance(SAMPLE_TEXT);
            const langMap: Record<string, string> = {
                American: "en-US",
                British: "en-GB",
                Indian: "en-IN",
            };
            utterance.lang = langMap[voice.accent] ?? "en-US";
            utterance.rate = 0.95;
            utterance.onend = () => setPlayingId(null);
            utterance.onerror = () => setPlayingId(null);
            window.speechSynthesis.speak(utterance);
        },
        [playingId, stopCurrent]
    );

    return (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {voices.map((voice, i) => {
                    const isSelected = selectedVoiceId === voice.id;
                    const isPlaying = playingId === voice.id;
                    const isLoading = loadingId === voice.id;

                    return (
                        <motion.div
                            key={voice.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                            onClick={() => onSelect(voice.id)}
                            id={`voice-card-${voice.id}`}
                            className={`
                relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer
                transition-all duration-200 select-none
                ${isSelected
                                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                    : "border-[#222] bg-[#111] hover:border-[#333] hover:bg-[#141414]"
                                }
              `}
                        >
                            {/* Selection indicator */}
                            <div
                                className={`
                  absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center
                  transition-all duration-200
                  ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-[#333]"}
                `}
                            >
                                {isSelected && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-white text-[8px] font-bold leading-none"
                                    >
                                        ✓
                                    </motion.span>
                                )}
                            </div>

                            {/* Avatar / gender icon */}
                            <div
                                className={`
                  flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl text-xl
                  ${isSelected ? "bg-indigo-500/20" : "bg-[#1a1a1a]"}
                `}
                            >
                                {voice.gender === "Female" ? "👩" : "👨"}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 pr-6">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-white font-semibold text-sm">{voice.name}</span>
                                    <span className="text-[#555] text-xs">{GENDER_ICON[voice.gender]}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base leading-none">{ACCENT_FLAG[voice.accent]}</span>
                                    <span className="text-[#666] text-xs">{voice.accent}</span>
                                </div>
                            </div>

                            {/* Play button */}
                            <button
                                id={`play-voice-${voice.id}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // don't also trigger card selection
                                    playPreview(voice);
                                }}
                                className={`
                  flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg
                  transition-all duration-200 border
                  ${isPlaying
                                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-400"
                                        : "border-[#333] bg-[#1a1a1a] text-[#666] hover:border-[#444] hover:text-white"
                                    }
                `}
                            >
                                {isLoading ? (
                                    <motion.div
                                        className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : isPlaying ? (
                                    <span className="text-xs">■</span>
                                ) : (
                                    <span className="text-xs">▶</span>
                                )}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Fallback note */}
            <p className="text-[#444] text-xs text-center">
                ▶ Preview uses Google TTS when available, browser speech as fallback
            </p>
        </div>
    );
}
