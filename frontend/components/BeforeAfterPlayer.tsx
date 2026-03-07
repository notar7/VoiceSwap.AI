"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "before" | "after";

interface BeforeAfterPlayerProps {
    originalUrl: string;
    processedUrl: string;
}

export function BeforeAfterPlayer({ originalUrl, processedUrl }: BeforeAfterPlayerProps) {
    const [activeTab, setActiveTab] = useState<Tab>("after");
    const beforeRef = useRef<HTMLVideoElement>(null);
    const afterRef = useRef<HTMLVideoElement>(null);

    const switchTab = (tab: Tab) => {
        // Pause whichever is currently playing before switching tabs
        beforeRef.current?.pause();
        afterRef.current?.pause();
        setActiveTab(tab);
    };

    return (
        <div className="w-full rounded-2xl border border-[#222] bg-[#111] overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-[#1e1e1e]">
                <button
                    onClick={() => switchTab("before")}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === "before"
                            ? "text-white bg-[#161616] border-b-2 border-[#444]"
                            : "text-[#555] hover:text-[#888]"
                    }`}
                >
                    🎬 Original Voice
                </button>
                <button
                    onClick={() => switchTab("after")}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === "after"
                            ? "text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500"
                            : "text-[#555] hover:text-[#888]"
                    }`}
                >
                    🎙️ VoiceSwap.AI
                </button>
            </div>

            {/* Video player area */}
            <div className="p-4">
                <AnimatePresence mode="wait">
                    {activeTab === "before" ? (
                        <motion.div
                            key="before-video"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <video
                                ref={beforeRef}
                                src={originalUrl}
                                controls
                                className="w-full rounded-xl bg-black max-h-[300px]"
                            />
                            <p className="text-xs text-[#444] font-medium">
                                Original — unmodified voice
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="after-video"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <video
                                ref={afterRef}
                                src={processedUrl}
                                controls
                                className="w-full rounded-xl bg-black border border-indigo-500/20 max-h-[300px]"
                            />
                            <p className="text-xs text-indigo-400/70 font-medium">
                                VoiceSwap.AI — Gemini-directed voice synthesis
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer hint */}
            <div className="px-4 pb-3 flex items-center justify-center">
                <p className="text-[10px] text-[#2a2a2a] uppercase tracking-widest font-medium">
                    Toggle tabs to compare original vs swapped voice
                </p>
            </div>
        </div>
    );
}
