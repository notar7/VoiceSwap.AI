"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ProcessingStep } from "@/types";

interface ProcessingStatusProps {
  steps: ProcessingStep[];
}

const statusConfig = {
  done: {
    icon: "✓",
    iconClass: "text-green-400",
    ringClass: "border-green-500/40 bg-green-500/10",
    labelClass: "text-white",
  },
  in_progress: {
    icon: null, // spinner rendered separately
    iconClass: "",
    ringClass: "border-indigo-500/60 bg-indigo-500/10",
    labelClass: "text-white",
  },
  error: {
    icon: "✕",
    iconClass: "text-red-400",
    ringClass: "border-red-500/40 bg-red-500/10",
    labelClass: "text-red-300",
  },
  pending: {
    icon: "·",
    iconClass: "text-[#444]",
    ringClass: "border-[#222] bg-transparent",
    labelClass: "text-[#555]",
  },
};

export function ProcessingStatus({ steps }: ProcessingStatusProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {steps.map((step, index) => {
        const cfg = statusConfig[step.status];
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06 }}
            className="flex items-center gap-4"
          >
            {/* Status icon */}
            <div
              className={`
                relative flex-shrink-0 flex items-center justify-center
                w-8 h-8 rounded-full border transition-all duration-300
                ${cfg.ringClass}
              `}
            >
              {step.status === "in_progress" ? (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span className={`text-sm font-bold leading-none ${cfg.iconClass}`}>
                  {cfg.icon}
                </span>
              )}
            </div>

            {/* Connector line (not for last item) */}
            <div className="flex-1">
              <span className={`text-sm font-medium transition-colors duration-300 ${cfg.labelClass}`}>
                {step.label}
              </span>
            </div>

            {/* "Live" pulse for in-progress */}
            <AnimatePresence>
              {step.status === "in_progress" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[10px] font-semibold tracking-widest text-indigo-400 uppercase"
                >
                  live
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
