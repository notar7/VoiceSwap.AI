"use client";

import { motion } from "framer-motion";
import { Upload, Brain, Mic, Activity, Play } from "lucide-react";

const STEPS = [
  { id: 1, label: "Upload",       Icon: Upload   },
  { id: 2, label: "Analyzing",    Icon: Brain    },
  { id: 3, label: "Select Voice", Icon: Mic      },
  { id: 4, label: "Synthesizing", Icon: Activity },
  { id: 5, label: "Result",       Icon: Play     },
];

interface StudioStepperProps {
  currentStep: number;
}

export function StudioStepper({ currentStep }: StudioStepperProps) {
  return (
    <div className="w-full flex items-center justify-center py-5 px-8">
      <div className="flex items-center max-w-2xl w-full">
        {STEPS.map((step, i) => {
          const isDone    = step.id < currentStep;
          const isActive  = step.id === currentStep;
          const isPending = step.id > currentStep;
          const { Icon } = step;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={
                    isActive
                      ? { boxShadow: "0 0 0 4px rgba(99,102,241,0.15), 0 0 20px rgba(99,102,241,0.35)" }
                      : { boxShadow: "0 0 0 0px rgba(99,102,241,0)" }
                  }
                  transition={{ duration: 0.4 }}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    transition-colors duration-300
                    ${isDone
                      ? "bg-indigo-600 border-indigo-600"
                      : isActive
                        ? "bg-indigo-500/15 border-indigo-500"
                        : "bg-[#0d0d0d] border-[#222]"
                    }
                  `}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors duration-300 ${
                      isDone    ? "text-white"      :
                      isActive  ? "text-indigo-400" :
                                  "text-[#333]"
                    }`}
                  />
                </motion.div>

                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                    isActive  ? "text-indigo-400" :
                    isDone    ? "text-[#444]"     :
                                "text-[#2a2a2a]"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line — not after last step */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[1px] mx-3 mb-5 bg-[#1a1a1a] relative overflow-hidden">
                  {isDone && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-indigo-600 origin-left"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
