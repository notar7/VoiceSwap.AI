"use client";

/**
 * StepSynthesis — Step 4 of the studio pipeline.
 * Animated equalizer waveform + live synthesis step list.
 * Bar heights are fixed (no Math.random) to avoid hydration mismatches.
 */

import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import type { ProcessingStep } from "@/types";

interface StepSynthesisProps {
  steps: ProcessingStep[];
  voiceName?: string;
}

// Fixed bar heights for the waveform (avoids server/client hydration mismatch)
const BAR_HEIGHTS = [12, 22, 36, 18, 42, 28, 14, 38, 20, 44, 16, 32, 24, 40, 10, 30, 18, 36, 14, 26];
const BAR_DURATIONS = [0.85, 0.72, 0.91, 0.68, 0.78, 0.95, 0.82, 0.70, 0.88, 0.75, 0.92, 0.65, 0.80, 0.73, 0.87, 0.77, 0.93, 0.69, 0.84, 0.71];

function EqWaveform() {
  return (
    <div className="flex items-center gap-1 h-12">
      {BAR_HEIGHTS.map((maxH, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-indigo-500 origin-center"
          animate={{ scaleY: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: BAR_DURATIONS[i],
            repeat: Infinity,
            delay: i * 0.055,
            ease: "easeInOut",
          }}
          style={{ height: `${maxH}px` }}
        />
      ))}
    </div>
  );
}

export function StepSynthesis({ steps, voiceName }: StepSynthesisProps) {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-10">

      {/* ── Waveform visualization ──────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 py-4">
        <EqWaveform />
        <p className="text-[#333] text-xs">
          Synthesizing{voiceName ? ` with ${voiceName}` : " voice"}
          <span className="inline-flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                className="text-indigo-400"
              >
                .
              </motion.span>
            ))}
          </span>
        </p>
      </div>

      {/* ── Step list ──────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col gap-3">
        {steps.map((step, i) => {
          const isDone    = step.status === "done";
          const isActive  = step.status === "in_progress";
          const isError   = step.status === "error";
          const isPending = step.status === "pending";

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border
                  ${isDone    ? "bg-green-500/10  border-green-500/30"  : ""}
                  ${isActive  ? "bg-indigo-500/10 border-indigo-500/35" : ""}
                  ${isError   ? "bg-red-500/10    border-red-500/30"    : ""}
                  ${isPending ? "bg-[#0d0d0d]     border-[#1a1a1a]"    : ""}
                `}
              >
                {isDone   && <Check    className="w-3.5 h-3.5 text-green-400" />}
                {isError  && <X        className="w-3.5 h-3.5 text-red-400"   />}
                {isActive && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400" />
                  </motion.div>
                )}
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-[#222] inline-block" />}
              </div>

              <span
                className={`
                  text-sm font-medium
                  ${isDone    ? "text-white"      : ""}
                  ${isActive  ? "text-indigo-300" : ""}
                  ${isError   ? "text-red-300"    : ""}
                  ${isPending ? "text-[#252525]"  : ""}
                `}
              >
                {step.label}
              </span>

              {isActive && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="ml-auto text-[9px] font-bold tracking-widest text-indigo-400 uppercase"
                >
                  live
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
