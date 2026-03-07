"use client";

/**
 * StepProcessing — Step 2 of the studio pipeline.
 * Shows an animated data-transfer visualization between a Video icon
 * and the Gemini brain icon, plus a live step-by-step status list.
 */

import { motion } from "framer-motion";
import { Film, Brain, Check, Loader2, X } from "lucide-react";
import type { ProcessingStep } from "@/types";

interface StepProcessingProps {
  steps: ProcessingStep[];
  filename?: string;
}

export function StepProcessing({ steps, filename }: StepProcessingProps) {
  return (
    <div className="w-full flex flex-col items-center gap-10">

      {/* ── Data-transfer visualization ────────────────────────────────── */}
      <div className="flex items-center gap-5 py-4">

        {/* Video icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
            <Film className="w-7 h-7 text-[#444]" />
          </div>
          <span className="text-[#333] text-[11px] font-medium">Video</span>
        </div>

        {/* Animated flowing dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500"
              animate={{
                opacity: [0.15, 1, 0.15],
                scale:   [0.7, 1.2, 0.7],
                x:       [0, 6, 0],
              }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Gemini brain icon with pulsing glow */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px rgba(99,102,241,0)",
                "0 0 24px rgba(99,102,241,0.45)",
                "0 0 0px rgba(99,102,241,0)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center"
          >
            <Brain className="w-7 h-7 text-indigo-400" />
          </motion.div>
          <span className="text-indigo-400/60 text-[11px] font-medium">Gemini 2.5 Flash</span>
        </div>

      </div>

      {/* File name */}
      {filename && (
        <p className="text-[#333] text-xs -mt-6 truncate max-w-[280px]">{filename}</p>
      )}

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
              animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              {/* Status circle */}
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
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400" />
                  </motion.div>
                )}
                {isPending && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a] inline-block" />
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-sm font-medium
                  ${isDone    ? "text-white"      : ""}
                  ${isActive  ? "text-indigo-300" : ""}
                  ${isError   ? "text-red-300"    : ""}
                  ${isPending ? "text-[#2a2a2a]"  : ""}
                `}
              >
                {step.label}
              </span>

              {/* "live" pulse badge on active step */}
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
