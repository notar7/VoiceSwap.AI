"use client";

/**
 * Studio page — the main 5-step VoiceSwap.AI pipeline.
 *
 * Step 1: Upload video
 * Step 2: Gemini AI analysis (transcription + emotion + voice direction)
 * Step 3: Voice selection (with JSON viewer)
 * Step 4: Voice synthesis + video merge
 * Step 5: Result — side-by-side before/after + download
 *
 * All backend API calls are done inline here to keep the state machine
 * fully in one place. lib/api.ts has the same calls for reference.
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Mic } from "lucide-react";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { StudioStepper }      from "@/components/StudioStepper";
import { StepUpload }         from "@/components/StepUpload";
import { StepProcessing }     from "@/components/StepProcessing";
import { StepVoiceSelect }    from "@/components/StepVoiceSelect";
import { StepSynthesis }      from "@/components/StepSynthesis";
import { StepResult }         from "@/components/StepResult";

import type { UploadResponse, AnalysisResponse, ProcessingStep, Voice } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Step 2 status items ───────────────────────────────────────────────────────
const ANALYSIS_STEPS: ProcessingStep[] = [
  { id: "received",  label: "Video received",                  status: "done"    },
  { id: "audio",     label: "Audio extracted",                 status: "done"    },
  { id: "sending",   label: "Sending to Gemini 2.5 Flash...",  status: "pending" },
  { id: "transcript",label: "Transcribing speech...",          status: "pending" },
  { id: "emotion",   label: "Analyzing emotion & tone...",     status: "pending" },
  { id: "direction", label: "Generating voice direction...",   status: "pending" },
];

// ── Step 4 status items ───────────────────────────────────────────────────────
const SYNTHESIS_STEPS: ProcessingStep[] = [
  { id: "selected",        label: "Voice selected",                       status: "done"    },
  { id: "ssml",            label: "Building SSML from transcript...",      status: "pending" },
  { id: "emotion_markers", label: "Applying emotion markers...",           status: "pending" },
  { id: "tts",             label: "Synthesizing voice with Google TTS...", status: "pending" },
  { id: "merge",           label: "Merging audio with video...",           status: "pending" },
  { id: "final",           label: "Finalizing output...",                  status: "pending" },
];

function setStepStatus(
  steps: ProcessingStep[],
  id: string,
  status: ProcessingStep["status"]
): ProcessingStep[] {
  return steps.map((s) => (s.id === id ? { ...s, status } : s));
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Widths per step (step 3 + 5 need more room) ───────────────────────────────
function contentWidth(step: number) {
  if (step === 3) return "max-w-[1300px]";
  if (step === 5) return "max-w-4xl";
  return "max-w-xl";
}

export default function StudioPage() {
  const [currentStep,    setCurrentStep]    = useState(1);
  const [uploadData,     setUploadData]     = useState<UploadResponse | null>(null);
  const [analysisData,   setAnalysisData]   = useState<AnalysisResponse | null>(null);
  const [voices,         setVoices]         = useState<Voice[]>([]);
  const [selectedVoiceId,setSelectedVoiceId]= useState<string | null>(null);
  const [downloadUrl,    setDownloadUrl]    = useState<string | null>(null);
  const [analyzeSteps,   setAnalyzeSteps]   = useState<ProcessingStep[]>(ANALYSIS_STEPS);
  const [synthSteps,     setSynthSteps]     = useState<ProcessingStep[]>(SYNTHESIS_STEPS);
  const [error,          setError]          = useState<string | null>(null);

  // Prefetch voices on mount so they appear immediately in step 3
  useEffect(() => {
    fetch(`${API_BASE}/voices`)
      .then((r) => r.json())
      .then((d) => setVoices(d.voices ?? []))
      .catch(() => {});
  }, []);

  // ── Step 1 → 2: upload complete, auto-trigger Gemini analysis ────────────
  const onUploadComplete = useCallback(async (data: UploadResponse) => {
    setUploadData(data);
    setCurrentStep(2);

    const freshSteps = ANALYSIS_STEPS.map((s) => ({ ...s }));
    setAnalyzeSteps(freshSteps);

    // Animate steps while the real API call runs in parallel
    await sleep(400);
    setAnalyzeSteps((s) => setStepStatus(s, "sending", "in_progress"));

    await sleep(1200);
    setAnalyzeSteps((s) => {
      let next = setStepStatus(s, "sending",    "done");
      next     = setStepStatus(next, "transcript", "in_progress");
      return next;
    });

    const apiPromise = fetch(`${API_BASE}/analyze/${data.job_id}`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? "Analysis failed");
        }
        return res.json() as Promise<AnalysisResponse>;
      });

    await sleep(2200);
    setAnalyzeSteps((s) => {
      let next = setStepStatus(s, "transcript", "done");
      next     = setStepStatus(next, "emotion",    "in_progress");
      return next;
    });

    await sleep(1800);
    setAnalyzeSteps((s) => {
      let next = setStepStatus(s, "emotion",   "done");
      next     = setStepStatus(next, "direction", "in_progress");
      return next;
    });

    let result: AnalysisResponse | null = null;
    let apiError: string | null = null;
    try {
      result = await apiPromise;
    } catch (e: unknown) {
      apiError = e instanceof Error ? e.message : "Unknown error";
    }

    if (apiError || !result) {
      setAnalyzeSteps((s) => setStepStatus(s, "direction", "error"));
      setError(apiError ?? "Analysis returned no data.");
      return;
    }

    setAnalyzeSteps((s) => setStepStatus(s, "direction", "done"));
    await sleep(350);
    setAnalysisData(result);
    setCurrentStep(3);
  }, []);

  // ── Step 3 → 4: user picks a voice ───────────────────────────────────────
  const onApplyVoice = useCallback(async (voiceId: string) => {
    if (!analysisData) return;

    setSelectedVoiceId(voiceId);
    setSynthSteps(SYNTHESIS_STEPS.map((s) => ({ ...s })));
    setCurrentStep(4);

    // Animate SSML build steps (instant — happens client-side)
    await sleep(400);
    setSynthSteps((s) => setStepStatus(s, "ssml", "in_progress"));
    await sleep(800);
    setSynthSteps((s) => {
      let next = setStepStatus(s, "ssml",            "done");
      next     = setStepStatus(next, "emotion_markers", "in_progress");
      return next;
    });
    await sleep(700);
    setSynthSteps((s) => {
      let next = setStepStatus(s, "emotion_markers", "done");
      next     = setStepStatus(next, "tts",             "in_progress");
      return next;
    });

    // Real TTS synthesis call (can take 5–15s)
    let synthError: string | null = null;
    try {
      const res = await fetch(`${API_BASE}/synthesize/${analysisData.job_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Synthesis failed");
      }
    } catch (e: unknown) {
      synthError = e instanceof Error ? e.message : "Synthesis failed";
    }

    if (synthError) {
      setSynthSteps((s) => setStepStatus(s, "tts", "error"));
      setError(synthError);
      return;
    }

    setSynthSteps((s) => {
      let next = setStepStatus(s, "tts",   "done");
      next     = setStepStatus(next, "merge", "in_progress");
      return next;
    });

    // ffmpeg merge call
    let mergeError: string | null = null;
    let dlUrl: string | null = null;
    try {
      const res = await fetch(`${API_BASE}/merge/${analysisData.job_id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Merge failed");
      }
      const body = await res.json();
      dlUrl = `${API_BASE}${body.download_url}`;
    } catch (e: unknown) {
      mergeError = e instanceof Error ? e.message : "Merge failed";
    }

    if (mergeError || !dlUrl) {
      setSynthSteps((s) => setStepStatus(s, "merge", "error"));
      setError(mergeError ?? "Merge returned no download URL.");
      return;
    }

    setSynthSteps((s) => {
      let next = setStepStatus(s, "merge", "done");
      next     = setStepStatus(next, "final", "done");
      return next;
    });

    await sleep(500);
    setDownloadUrl(dlUrl);
    setCurrentStep(5);
  }, [analysisData]);

  // ── Reset everything ──────────────────────────────────────────────────────
  const reset = () => {
    setCurrentStep(1);
    setUploadData(null);
    setAnalysisData(null);
    setAnalyzeSteps(ANALYSIS_STEPS);
    setSynthSteps(SYNTHESIS_STEPS);
    setError(null);
    setSelectedVoiceId(null);
    setDownloadUrl(null);
  };

  const selectedVoiceName = voices.find((v) => v.id === selectedVoiceId)?.name;

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/[0.04]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
            <Mic className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            VoiceSwap<span className="text-indigo-400">.AI</span>
          </span>
        </Link>
      </nav>

      {/* ── Step progress bar ────────────────────────────────────────────── */}
      <div className="relative z-10 border-b border-white/[0.03]">
        <StudioStepper currentStep={currentStep} />
      </div>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex justify-center px-8 py-10">
        <div className={`w-full transition-all duration-300 ${contentWidth(currentStep)}`}>
        <AnimatePresence mode="wait">

          {/* Step 1 — Upload */}
          {!error && currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <StepUpload onUploadComplete={onUploadComplete} />
            </motion.div>
          )}

          {/* Step 2 — AI Processing */}
          {!error && currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-2">Analyzing with Gemini</h2>
                <p className="text-[#444] text-sm">{uploadData?.filename}</p>
              </div>
              <StepProcessing steps={analyzeSteps} filename={uploadData?.filename} />
            </motion.div>
          )}

          {/* Step 3 — Voice selection */}
          {!error && currentStep === 3 && analysisData && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <StepVoiceSelect
                analysis={analysisData}
                voices={voices}
                onApplyVoice={onApplyVoice}
              />
            </motion.div>
          )}

          {/* Step 4 — Synthesis */}
          {!error && currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-2">Creating your new voice</h2>
                <p className="text-[#444] text-sm">Google TTS · Gemini voice direction</p>
              </div>
              <StepSynthesis steps={synthSteps} voiceName={selectedVoiceName} />
            </motion.div>
          )}

          {/* Step 5 — Result */}
          {!error && currentStep === 5 && downloadUrl && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <StepResult
                originalUrl={`${API_BASE}/original/${uploadData?.job_id}`}
                processedUrl={downloadUrl}
                downloadUrl={downloadUrl}
                onReset={reset}
              />
            </motion.div>
          )}

          {/* Error state */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-5 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-10 text-center max-w-md mx-auto"
            >
              <span className="text-4xl">⚠️</span>
              <div>
                <p className="text-white font-semibold text-lg mb-2">Something went wrong</p>
                <p className="text-red-400/80 text-sm leading-relaxed">{error}</p>
              </div>
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl bg-[#111] border border-[#222] text-white text-sm font-medium hover:border-indigo-500/50 transition-all"
              >
                Start over
              </button>
            </motion.div>
          )}

        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
