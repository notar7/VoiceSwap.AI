"use client";

/**
 * StepResult — Step 5 of the studio pipeline.
 * Side-by-side original vs VoiceSwap.AI video players.
 * Download + Process Another buttons.
 * Entrance animation with a success glow pulse.
 */

import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";

interface StepResultProps {
  originalUrl: string;
  processedUrl: string;
  downloadUrl: string;
  onReset: () => void;
}

export function StepResult({ originalUrl, processedUrl, downloadUrl, onReset }: StepResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
      className="w-full flex flex-col gap-6"
    >
      {/* ── Success badge ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-green-500/8 border border-green-500/20 text-green-400 text-sm font-medium">
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-green-400 inline-block"
          />
          Voice Swapped Successfully
        </div>
      </motion.div>

      {/* ── Side-by-side video players ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Original */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#444] text-xs font-semibold uppercase tracking-widest">Original</span>
          </div>
          <div className="rounded-xl border border-[#1a1a1a] bg-black overflow-hidden">
            <video src={originalUrl} controls className="w-full max-h-[280px]" />
          </div>
        </div>

        {/* VoiceSwap.AI output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">VoiceSwap.AI</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 text-[9px] font-bold border border-indigo-500/20 uppercase tracking-wide">
              New
            </span>
          </div>
          <motion.div
            initial={{ boxShadow: "0 0 0px rgba(99,102,241,0)" }}
            animate={{ boxShadow: "0 0 24px rgba(99,102,241,0.15)" }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="rounded-xl border border-indigo-500/20 bg-black overflow-hidden"
          >
            <video src={processedUrl} controls className="w-full max-h-[280px]" />
          </motion.div>
        </div>

      </div>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <motion.a
          href={downloadUrl}
          download="voiceswap_output.mp4"
          id="download-btn"
          whileHover={{ scale: 1.03, boxShadow: "0 0 36px rgba(99,102,241,0.45)" }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-sm shadow-[0_0_24px_rgba(99,102,241,0.3)] transition-all"
        >
          <Download className="w-4 h-4" />
          Download Video
        </motion.a>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-[#222] bg-transparent text-[#666] hover:text-white hover:border-[#333] font-medium text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Process Another
        </button>
      </div>

    </motion.div>
  );
}
