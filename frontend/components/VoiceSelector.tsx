"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import type { Voice } from "@/types";

interface VoiceSelectorProps {
    voices: Voice[];
    selectedVoiceId: string | null;
    onSelect: (voiceId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCENT_FLAG: Record<string, string> = {
    American: "🇺🇸",
    British: "🇬🇧",
    Indian: "🇮🇳",
};

// Blue for Male, purple for Female — applied consistently across avatar + card border
const GENDER_THEME: Record<string, {
    avatarGrad: string;
    avatarIcon: string;
    selectedBorder: string;
    selectedBg: string;
    selectedGlow: string;
    selectedRadio: string;
    colLabel: string;
    colLabelText: string;
}> = {
    Male: {
        avatarGrad:    "from-blue-900/60 to-indigo-900/60",
        avatarIcon:    "text-blue-300",
        selectedBorder:"border-blue-500",
        selectedBg:    "bg-blue-500/10",
        selectedGlow:  "shadow-[0_0_20px_rgba(59,130,246,0.18)]",
        selectedRadio: "border-blue-500 bg-blue-500",
        colLabel:      "text-blue-400",
        colLabelText:  "Male",
    },
    Female: {
        avatarGrad:    "from-purple-900/60 to-pink-900/60",
        avatarIcon:    "text-purple-300",
        selectedBorder:"border-purple-500",
        selectedBg:    "bg-purple-500/10",
        selectedGlow:  "shadow-[0_0_20px_rgba(168,85,247,0.18)]",
        selectedRadio: "border-purple-500 bg-purple-500",
        colLabel:      "text-purple-400",
        colLabelText:  "Female",
    },
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

    const males   = voices.filter((v) => v.gender === "Male");
    const females = voices.filter((v) => v.gender === "Female");

    const renderColumn = (group: Voice[], gender: "Male" | "Female") => {
        const theme = GENDER_THEME[gender];
        return (
            <div className="flex flex-col gap-2.5">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1 mb-0.5">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.avatarGrad} border border-white/10 flex items-center justify-center`}>
                        <UserRound className={`w-3 h-3 ${theme.avatarIcon}`} />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${theme.colLabel}`}>
                        {theme.colLabelText}
                    </span>
                </div>

                {group.map((voice, i) => {
                    const isSelected = selectedVoiceId === voice.id;
                    const isPlaying  = playingId === voice.id;
                    const isLoading  = loadingId === voice.id;

                    return (
                        <motion.div
                            key={voice.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: i * 0.06 }}
                            onClick={() => onSelect(voice.id)}
                            id={`voice-card-${voice.id}`}
                            className={`
                                relative flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer
                                transition-all duration-200 select-none
                                ${isSelected
                                    ? `${theme.selectedBorder} ${theme.selectedBg} ${theme.selectedGlow}`
                                    : "border-[#222] bg-[#111] hover:border-[#2a2a2a] hover:bg-[#141414]"
                                }
                            `}
                        >
                            {/* Selection radio */}
                            <div className={`
                                absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center
                                transition-all duration-200
                                ${isSelected ? theme.selectedRadio : "border-[#333]"}
                            `}>
                                {isSelected && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-white text-[8px] font-bold leading-none"
                                    >✓</motion.span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className={`
                                flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl
                                bg-gradient-to-br ${theme.avatarGrad} border border-white/[0.07]
                            `}>
                                <UserRound className={`w-5 h-5 ${theme.avatarIcon}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 pr-6">
                                <p className="text-white font-semibold text-sm leading-tight">{voice.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-sm leading-none">{ACCENT_FLAG[voice.accent] ?? "🌐"}</span>
                                    <span className="text-[#555] text-[11px]">{voice.accent}</span>
                                </div>
                            </div>

                            {/* Play button */}
                            <button
                                id={`play-voice-${voice.id}`}
                                onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                                className={`
                                    flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg
                                    transition-all duration-200 border text-xs
                                    ${isPlaying
                                        ? `${theme.selectedBorder} ${theme.selectedBg} ${theme.avatarIcon}`
                                        : "border-[#333] bg-[#1a1a1a] text-[#666] hover:border-[#444] hover:text-white"
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <motion.div
                                        className={`w-3 h-3 rounded-full border-2 ${theme.avatarIcon} border-t-transparent`}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : isPlaying ? "■" : "▶"}
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {renderColumn(males,   "Male")}
                {renderColumn(females, "Female")}
            </div>
            <p className="text-[#444] text-xs text-center">
                ▶ Preview uses Google TTS when available, browser speech as fallback
            </p>
        </div>
    );
}
