"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { VideoUploader } from "@/components/VideoUploader";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import type { UploadResponse, AnalysisResponse, ProcessingStep, Voice } from "@/types";

type AppPhase = "upload" | "analyzing" | "analyzed" | "synthesizing" | "done" | "error";

// ── Pipeline step definitions ─────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: 1, label: "Upload",     icon: "⬆",  phase: ["upload"] },
  { id: 2, label: "Analyze",   icon: "✨",  phase: ["analyzing"] },
  { id: 3, label: "Voice",     icon: "🎤", phase: ["analyzed"] },
  { id: 4, label: "Synthesize",icon: "🔊", phase: ["synthesizing"] },
  { id: 5, label: "Done",      icon: "🎉", phase: ["done"] },
] as const;

const PHASE_TO_STEP: Record<AppPhase, number> = {
  upload: 1, analyzing: 2, analyzed: 3, synthesizing: 4, done: 5, error: 0,
};

const ANALYSIS_STEPS: ProcessingStep[] = [
  { id: "uploaded",   label: "Video uploaded",                 status: "done" },
  { id: "audio",      label: "Audio extracted",                status: "done" },
  { id: "sending",    label: "Sending to Gemini 2.5 Flash...", status: "pending" },
  { id: "transcript", label: "Transcribing speech...",         status: "pending" },
  { id: "emotion",    label: "Analyzing emotion & tone...",    status: "pending" },
];

const SYNTHESIS_STEPS: ProcessingStep[] = [
  { id: "uploaded", label: "Video uploaded",                     status: "done" },
  { id: "analyzed", label: "Analyzed with Gemini",               status: "done" },
  { id: "ssml",     label: "Building voice direction SSML...",   status: "pending" },
  { id: "tts",      label: "Synthesizing voice with Google TTS...", status: "pending" },
  { id: "merge",    label: "Merging audio with video...",        status: "pending" },
  { id: "ready",    label: "Ready for download!",                status: "pending" },
];

const ACCENT_FLAG: Record<string, string> = {
  American: "🇺🇸",
  British:  "🇬🇧",
  Indian:   "🇮🇳",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

// ── Framer Motion variants ────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

// ── Circular Step Progress Bar ────────────────────────────────────────────────
// Circles and connector lines are interleaved directly in the flex row so the
// lines start/end exactly at circle edges — no calc() math needed.

function StepProgressBar({
  currentStep,
  errorStep,
}: {
  currentStep: number;
  errorStep: boolean;
}) {
  return (
    <div className="w-full mb-12">
      {/* Row 1: circles interleaved with line segments */}
      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, i) => {
          const isDone   = !errorStep && currentStep > step.id;
          const isActive = !errorStep && currentStep === step.id;
          const isErr    = errorStep && step.id === currentStep;
          // A segment is "filled" when the step to its left is complete
          const segmentFilled = !errorStep && currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <motion.div
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 0px rgba(99,102,241,0)",
                          "0 0 22px rgba(99,102,241,0.6)",
                          "0 0 10px rgba(99,102,241,0.3)",
                        ],
                      }
                    : { boxShadow: "none" }
                }
                transition={isActive ? { duration: 1.8, repeat: Infinity } : { duration: 0.4 }}
                className={[
                  "flex-shrink-0 w-14 h-14 rounded-full border-[3px] flex items-center justify-center select-none transition-colors duration-300 text-lg font-bold",
                  isDone
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : isActive
                    ? "bg-indigo-600/15 border-indigo-500 text-indigo-300"
                    : isErr
                    ? "bg-red-600/15 border-red-500 text-red-400"
                    : "bg-[#0f0f0f] border-[#2a2a2a] text-[#3a3a3a]",
                ].join(" ")}
              >
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    className="text-xl"
                  >
                    ✓
                  </motion.span>
                ) : isActive && step.id !== 1 && step.id !== 5 ? (
                  <motion.div
                    className="w-6 h-6 rounded-full border-[3px] border-indigo-400 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <span>{step.icon}</span>
                )}
              </motion.div>

              {/* Connector line — between this circle and the next (not after last) */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex-1 h-[3px] rounded-full bg-[#252525] mx-0 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 origin-left"
                    animate={{ scaleX: segmentFilled ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: labels below each circle */}
      <div className="flex items-start mt-3">
        {PIPELINE_STEPS.map((step, i) => {
          const isDone   = !errorStep && currentStep > step.id;
          const isActive = !errorStep && currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Label centred under its circle (circle is w-14 = 56px) */}
              <div className="w-14 flex-shrink-0 flex justify-center">
                <span
                  className={[
                    "text-[11px] font-bold uppercase tracking-widest transition-colors duration-300 text-center leading-tight",
                    isDone ? "text-indigo-400" : isActive ? "text-white" : "text-[#3a3a3a]",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {/* Spacer matching the connector line width */}
              {i < PIPELINE_STEPS.length - 1 && <div className="flex-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Voice Avatar Card ─────────────────────────────────────────────────────────
const AVATAR_BG: Record<string, { grad: string; ring: string; text: string }> = {
  Male:   { grad: "from-blue-900/50 to-indigo-900/50",  ring: "border-blue-500/40",   text: "text-blue-300" },
  Female: { grad: "from-purple-900/50 to-pink-900/50",  ring: "border-purple-500/40", text: "text-purple-300" },
};

interface VoiceAvatarGridProps {
  voices: Voice[];
  selectedVoiceId: string | null;
  onSelect: (id: string) => void;
  onApply: () => void;
  isApplying: boolean;
}

function VoiceAvatarGrid({
  voices,
  selectedVoiceId,
  onSelect,
  onApply,
  isApplying,
}: VoiceAvatarGridProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsOk = useRef<boolean>(true);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    },
    []
  );

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setPlayingId(null);
  }, []);

  const playPreview = useCallback(
    async (voice: Voice) => {
      if (playingId === voice.id) { stopAll(); return; }
      stopAll();
      setLoadingId(voice.id);
      try {
        if (ttsOk.current) {
          const res = await fetch(`${API_BASE}/preview-voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice_id: voice.id, sample_text: "Hello, I am your new AI voice." }),
          });
          if (res.ok) {
            const url = URL.createObjectURL(await res.blob());
            const a = new Audio(url);
            audioRef.current = a;
            setLoadingId(null);
            setPlayingId(voice.id);
            a.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
            a.play();
            return;
          } else {
            ttsOk.current = false;
          }
        }
      } catch { /* fall through */ }
      setLoadingId(null);
      setPlayingId(voice.id);
      const utt = new SpeechSynthesisUtterance("Hello, I am your new AI voice.");
      utt.lang =
        ({ American: "en-US", British: "en-GB", Indian: "en-IN" } as Record<string, string>)[
          voice.accent
        ] ?? "en-US";
      utt.onend = () => setPlayingId(null);
      utt.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utt);
    },
    [playingId, stopAll]
  );

  const displayVoices = voices.slice(0, 6);

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="grid grid-cols-2 gap-3 flex-1">
        {displayVoices.map((voice, i) => {
          const isSelected = selectedVoiceId === voice.id;
          const isPlaying  = playingId === voice.id;
          const isLoading  = loadingId === voice.id;
          const colors = AVATAR_BG[voice.gender] ?? AVATAR_BG.Male;

          return (
            <motion.div
              key={voice.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
              onClick={() => onSelect(voice.id)}
              className={[
                "relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none overflow-hidden",
                isSelected
                  ? "border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.2)]"
                  : "border-[#222] hover:border-[#333]",
              ].join(" ")}
            >
              {/* gradient bg */}
              <div
                className={[
                  "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                  colors.grad,
                  isSelected ? "opacity-100" : "opacity-0",
                ].join(" ")}
              />

              {/* checkmark */}
              <div
                className={[
                  "absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-200",
                  isSelected ? "border-indigo-400 bg-indigo-500" : "border-[#333]",
                ].join(" ")}
              >
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-[8px] font-black leading-none"
                  >
                    ✓
                  </motion.span>
                )}
              </div>

              {/* avatar */}
              <div
                className={[
                  "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl bg-[#0a0a0a]",
                  isSelected ? colors.ring : "border-[#2a2a2a]",
                ].join(" ")}
              >
                {voice.gender === "Female" ? "👩" : "👨"}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-400"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* name + accent */}
              <div className="text-center z-10">
                <p className="text-white font-semibold text-xs leading-tight">{voice.name}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className="text-sm leading-none">{ACCENT_FLAG[voice.accent] ?? "🌐"}</span>
                  <span className={`text-[10px] ${colors.text}`}>{voice.accent}</span>
                </div>
              </div>

              {/* preview button */}
              <button
                onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                className={[
                  "z-10 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-200",
                  isPlaying
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-[#2a2a2a] bg-[#111] text-[#555] hover:text-white hover:border-[#444]",
                ].join(" ")}
              >
                {isLoading ? (
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                ) : isPlaying ? (
                  <>■ Stop</>
                ) : (
                  <>▶ Preview</>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Apply button */}
      <AnimatePresence>
        {selectedVoiceId && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22 }}
            onClick={onApply}
            disabled={isApplying}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm transition-all duration-200 shadow-[0_0_28px_rgba(99,102,241,0.35)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isApplying ? "Applying…" : "Apply Voice →"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Side-by-side result player ────────────────────────────────────────────────
function SideBySidePlayer({
  originalUrl,
  processedUrl,
}: {
  originalUrl: string;
  processedUrl: string;
}) {
  return (
    <div className="w-full grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-[#444] flex-shrink-0" />
          <span className="text-xs text-[#666] font-semibold uppercase tracking-wider">Original Voice</span>
        </div>
        <div className="rounded-2xl border border-[#2a2a2a] bg-black overflow-hidden">
          <video src={originalUrl} controls className="w-full max-h-[240px] bg-black" />
        </div>
        <p className="text-[10px] text-[#444] text-center">Unmodified — original audio</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 shadow-[0_0_6px_rgba(99,102,241,0.7)]" />
          <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">VoiceSwap.AI</span>
        </div>
        <div className="rounded-2xl border border-indigo-500/25 bg-black overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.1)]">
          <video src={processedUrl} controls className="w-full max-h-[240px] bg-black" />
        </div>
        <p className="text-[10px] text-indigo-400/50 text-center">Gemini-directed · Google TTS</p>
      </div>
    </div>
  );
}

// ── Shared card wrapper ───────────────────────────────────────────────────────
// All steps use the same max-width so the page never shifts width between steps.
function StepCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-5xl mx-auto rounded-3xl border border-[#1e1e1e] bg-[#0f0f0f] shadow-xl ${className}`}>
      {children}
    </div>
  );
}

// ── Main Studio Page ──────────────────────────────────────────────────────────
export default function StudioPage() {
  const [phase, setPhase]               = useState<AppPhase>("upload");
  const [uploadData, setUploadData]     = useState<UploadResponse | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [analyzeSteps, setAnalyzeSteps] = useState<ProcessingStep[]>(ANALYSIS_STEPS);
  const [synthSteps, setSynthSteps]     = useState<ProcessingStep[]>(SYNTHESIS_STEPS);
  const [error, setError]               = useState<string | null>(null);
  const [voices, setVoices]             = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl]   = useState<string | null>(null);
  const [isApplying, setIsApplying]     = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/voices`)
      .then((r) => r.json())
      .then((d) => setVoices(d.voices ?? []))
      .catch(() => {});
  }, []);

  const onUploadComplete = useCallback(async (data: UploadResponse) => {
    setUploadData(data);
    setPhase("analyzing");
    const fresh = ANALYSIS_STEPS.map((s) => ({ ...s }));
    setAnalyzeSteps(fresh);
    await sleep(400);
    setAnalyzeSteps((s) => setStepStatus(s, "sending", "in_progress"));
    await sleep(1200);
    setAnalyzeSteps((s) => {
      let n = setStepStatus(s, "sending", "done");
      n = setStepStatus(n, "transcript", "in_progress");
      return n;
    });
    const apiPromise = fetch(`${API_BASE}/analyze/${data.job_id}`, { method: "POST" }).then(
      async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail ?? "Analysis failed");
        }
        return res.json() as Promise<AnalysisResponse>;
      }
    );
    await sleep(2000);
    setAnalyzeSteps((s) => {
      let n = setStepStatus(s, "transcript", "done");
      n = setStepStatus(n, "emotion", "in_progress");
      return n;
    });
    let result: AnalysisResponse | null = null;
    let apiError: string | null = null;
    try { result = await apiPromise; } catch (e: unknown) {
      apiError = e instanceof Error ? e.message : "Unknown error";
    }
    if (apiError || !result) {
      setAnalyzeSteps((s) => setStepStatus(s, "emotion", "error"));
      setError(apiError ?? "Analysis returned no data.");
      setPhase("error");
      return;
    }
    setAnalyzeSteps((s) => setStepStatus(s, "emotion", "done"));
    await sleep(300);
    setAnalysisData(result);
    setPhase("analyzed");
  }, []);

  const onApplyVoice = useCallback(async () => {
    if (!analysisData || !selectedVoiceId) return;
    setIsApplying(true);
    setSynthSteps(SYNTHESIS_STEPS.map((s) => ({ ...s })));
    setPhase("synthesizing");
    await sleep(300);
    setSynthSteps((s) => setStepStatus(s, "ssml", "in_progress"));
    await sleep(800);
    setSynthSteps((s) => {
      let n = setStepStatus(s, "ssml", "done");
      n = setStepStatus(n, "tts", "in_progress");
      return n;
    });
    let synthError: string | null = null;
    try {
      const res = await fetch(`${API_BASE}/synthesize/${analysisData.job_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedVoiceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Synthesis failed");
      }
    } catch (e: unknown) {
      synthError = e instanceof Error ? e.message : "Synthesis failed";
    }
    if (synthError) {
      setSynthSteps((s) => setStepStatus(s, "tts", "error"));
      setError(synthError);
      setPhase("error");
      setIsApplying(false);
      return;
    }
    setSynthSteps((s) => {
      let n = setStepStatus(s, "tts", "done");
      n = setStepStatus(n, "merge", "in_progress");
      return n;
    });
    let mergeError: string | null = null;
    let dlUrl: string | null = null;
    try {
      const res = await fetch(`${API_BASE}/merge/${analysisData.job_id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Merge failed");
      }
      const d = await res.json() as { download_url: string };
      dlUrl = `${API_BASE}${d.download_url}`;
    } catch (e: unknown) {
      mergeError = e instanceof Error ? e.message : "Merge failed";
    }
    if (mergeError || !dlUrl) {
      setSynthSteps((s) => setStepStatus(s, "merge", "error"));
      setError(mergeError ?? "No download URL");
      setPhase("error");
      setIsApplying(false);
      return;
    }
    setSynthSteps((s) => {
      let n = setStepStatus(s, "merge", "done");
      n = setStepStatus(n, "ready", "done");
      return n;
    });
    await sleep(400);
    setDownloadUrl(dlUrl);
    setIsApplying(false);
    setPhase("done");
  }, [analysisData, selectedVoiceId]);

  const reset = () => {
    setPhase("upload");
    setUploadData(null);
    setAnalysisData(null);
    setAnalyzeSteps(ANALYSIS_STEPS);
    setSynthSteps(SYNTHESIS_STEPS);
    setError(null);
    setSelectedVoiceId(null);
    setDownloadUrl(null);
    setIsApplying(false);
  };

  const currentStep = PHASE_TO_STEP[phase];
  const isError     = phase === "error";

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-10">
      {/* ── Page wrapper — wide enough for the 3-col step-3 layout ── */}
      <div className="max-w-5xl mx-auto flex flex-col gap-0">

        {/* ── Navbar / brand ─────────────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="/" className="group">
            <span className="text-3xl font-extrabold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              Voice<span className="text-indigo-400">Swap</span>
              <span className="text-[#3a3a3a]">.AI</span>
            </span>
          </a>
          <a
            href="/"
            className="text-sm font-medium text-[#666] hover:text-white transition-colors border border-[#252525] hover:border-indigo-500/40 rounded-xl px-4 py-2"
          >
            ← Back to Home
          </a>
        </motion.div>

        {/* ── Progress Bar ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StepProgressBar currentStep={currentStep} errorStep={isError} />
        </motion.div>

        {/* ── Step content panel ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* STEP 1 — Upload */}
          {phase === "upload" && (
            <motion.div key="upload" variants={fadeUp} initial="hidden" animate="show" exit="exit">
              <StepCard className="p-10">
                <div className="mb-6 text-center">
                  <h2 className="text-white font-bold text-2xl mb-2">Upload your video</h2>
                  <p className="text-[#555] text-sm">MP4, MOV or WebM · max 200 MB · with spoken audio</p>
                </div>
                <VideoUploader onUploadComplete={onUploadComplete} />
              </StepCard>
            </motion.div>
          )}

          {/* STEP 2 — Analyzing */}
          {phase === "analyzing" && (
            <motion.div key="analyzing" variants={fadeUp} initial="hidden" animate="show" exit="exit">
              <StepCard className="p-12 flex flex-col items-center gap-8">
                <div className="text-center">
                  <motion.div
                    className="mx-auto mb-5 w-20 h-20 rounded-full border-2 border-indigo-500/40 flex items-center justify-center text-4xl bg-indigo-500/5"
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(99,102,241,0)",
                        "0 0 32px rgba(99,102,241,0.45)",
                        "0 0 0px rgba(99,102,241,0)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨
                  </motion.div>
                  <h2 className="text-white font-bold text-2xl mb-1">Gemini is analyzing your video</h2>
                  <p className="text-[#444] text-sm mt-1">{uploadData?.filename}</p>
                </div>
                <div className="w-full max-w-md">
                  <ProcessingStatus steps={analyzeSteps} />
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* STEP 3 — Analyze results + Pick Voice (3-column layout) */}
          {phase === "analyzed" && analysisData && (
            <motion.div key="analyzed" variants={fadeUp} initial="hidden" animate="show" exit="exit"
              className="flex flex-col gap-5"
            >
              <StepCard>
                {/* Header */}
                <div className="flex items-center gap-3 px-7 pt-6 pb-4 border-b border-[#1a1a1a]">
                  <span className="text-lg">✨</span>
                  <span className="text-white font-bold text-lg">Gemini Analysis Complete</span>
                  <div className="flex-1 h-px bg-[#1a1a1a]" />
                  <span className="text-green-400/60 text-xs font-semibold border border-green-500/20 bg-green-500/5 rounded-full px-3 py-1">
                    ✓ Done
                  </span>
                </div>

                {/* 3-column body */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-[#1a1a1a]">

                  {/* COL 1 — Voice Direction JSON */}
                  <div className="flex flex-col p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🎤</span>
                      <span className="text-indigo-400 font-semibold text-xs uppercase tracking-wider">Voice Direction</span>
                    </div>
                    <div className="rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden">
                      <div className="p-3 h-120 overflow-y-auto">
                        <pre className="text-[10px] text-indigo-300/70 leading-relaxed whitespace-pre-wrap font-mono">
                          {JSON.stringify(analysisData.voice_direction, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <p className="text-[9px] text-indigo-400/30 text-center mt-2 uppercase tracking-widest">
                      Gemini 2.5 Flash output
                    </p>
                  </div>

                  {/* COL 2 — Transcript JSON */}
                  <div className="flex flex-col p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📝</span>
                      <span className="text-indigo-400 font-semibold text-xs uppercase tracking-wider">Transcript</span>
                    </div>
                    <div className="rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden">
                      <div className="p-3 h-120 overflow-y-auto">
                        <pre className="text-[10px] text-indigo-300/70 leading-relaxed whitespace-pre-wrap font-mono">
                          {JSON.stringify(analysisData.transcript, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <p className="text-[9px] text-indigo-400/30 text-center mt-2 uppercase tracking-widest">
                      Word-level timestamps
                    </p>
                  </div>

                  {/* COL 3 — Voice selection */}
                  <div className="flex flex-col p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🎙️</span>
                      <span className="text-white font-semibold text-xs uppercase tracking-wider">Choose Voice</span>
                      {selectedVoiceId && (
                        <span className="ml-auto text-indigo-400 text-[9px] border border-indigo-500/30 bg-indigo-500/10 rounded-full px-2 py-0.5">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    {voices.length > 0 ? (
                      <VoiceAvatarGrid
                        voices={voices}
                        selectedVoiceId={selectedVoiceId}
                        onSelect={setSelectedVoiceId}
                        onApply={onApplyVoice}
                        isApplying={isApplying}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-12 text-[#444]">
                        <motion.div
                          className="w-6 h-6 rounded-full border-2 border-[#333] border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-sm">Loading voices…</span>
                      </div>
                    )}
                  </div>
                </div>
              </StepCard>

              <button
                onClick={reset}
                className="self-center text-[#333] text-xs hover:text-[#555] transition-colors underline underline-offset-2"
              >
                Upload a different video
              </button>
            </motion.div>
          )}

          {/* STEP 4 — Synthesizing */}
          {phase === "synthesizing" && (
            <motion.div key="synthesizing" variants={fadeUp} initial="hidden" animate="show" exit="exit">
              <StepCard className="p-12 flex flex-col items-center gap-8">
                <div className="text-center">
                  <motion.div
                    className="mx-auto mb-5 w-20 h-20 rounded-full border-2 border-indigo-500/40 flex items-center justify-center text-4xl bg-indigo-500/5"
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(99,102,241,0)",
                        "0 0 36px rgba(99,102,241,0.5)",
                        "0 0 0px rgba(99,102,241,0)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🔊
                  </motion.div>
                  <h2 className="text-white font-bold text-2xl mb-1">Creating your new voice</h2>
                  <p className="text-[#444] text-sm mt-1">Google TTS · Gemini-directed voice synthesis</p>
                </div>
                <div className="w-full max-w-md">
                  <ProcessingStatus steps={synthSteps} />
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* STEP 5 — Done */}
          {phase === "done" && downloadUrl && uploadData && (
            <motion.div
              key="done"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-col gap-5"
            >
              {/* Success banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 22 }}
                className="w-full max-w-5xl mx-auto rounded-3xl border border-green-500/20 bg-[#0f0f0f] p-6 flex items-center gap-5 shadow-[0_0_32px_rgba(34,197,94,0.08)]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className="flex-shrink-0 w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl"
                >
                  🎉
                </motion.div>
                <div>
                  <p className="text-white font-bold text-xl">Voice Swap Complete!</p>
                  <p className="text-[#555] text-sm mt-0.5">
                    Gemini analyzed · Google TTS synthesized · Video merged
                  </p>
                </div>
              </motion.div>

              {/* Side-by-side video comparison */}
              <StepCard className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-white font-bold text-lg">Compare Results</span>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                  <span className="text-[#2a2a2a] text-[10px] uppercase tracking-widest">Side by side</span>
                </div>
                <SideBySidePlayer
                  originalUrl={`${API_BASE}/original/${uploadData.job_id}`}
                  processedUrl={downloadUrl}
                />
              </StepCard>

              {/* Action buttons */}
              <div className="w-full max-w-5xl mx-auto grid grid-cols-2 gap-4">
                <a
                  href={downloadUrl}
                  download="voiceswap_output.mp4"
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold text-base transition-all duration-200 shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:shadow-[0_0_36px_rgba(34,197,94,0.45)]"
                >
                  ⬇ Download Video
                </a>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] hover:bg-[#141414] hover:border-[#383838] text-white font-bold text-base transition-all duration-200"
                >
                  ↺ Process Another Video
                </button>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {phase === "error" && (
            <motion.div key="error" variants={fadeUp} initial="hidden" animate="show" exit="exit">
              <StepCard className="p-12 flex flex-col items-center gap-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl">
                  ❌
                </div>
                <div>
                  <p className="text-white font-bold text-2xl mb-2">Something went wrong</p>
                  <p className="text-red-400/80 text-sm max-w-sm leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={reset}
                  className="px-10 py-3 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-indigo-500/40 text-white text-sm font-semibold transition-all duration-200"
                >
                  Try Again
                </button>
              </StepCard>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
