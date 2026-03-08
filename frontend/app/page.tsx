"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Animation primitives                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

/** Wraps children in a staggered fade-in triggered by scroll into view */
function InView({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Static data — module-level to avoid SSR hydration mismatch                 */
/* ─────────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    emoji: "⬆️",
    title: "Upload Video",
    desc: "Drop any MP4 or MOV. Up to 2 minutes.",
  },
  {
    n: "02",
    emoji: "🧠",
    title: "Gemini Analyzes",
    desc: "Transcription, emotion, tone and pacing in a single API call.",
  },
  {
    n: "03",
    emoji: "🎭",
    title: "Pick a Voice",
    desc: "6 expressive voices across accents and genders.",
  },
  {
    n: "04",
    emoji: "🔊",
    title: "TTS Synthesizes",
    desc: "Gemini-authored SSML drives a truly expressive performance.",
  },
  {
    n: "05",
    emoji: "🎦",
    title: "Download",
    desc: "New voice merged into your video. Ready to share.",
  },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "Gemini as Voice Director",
    desc: "Not just a transcriber. Gemini detects emotion segments, emphasis words, and writes expressive SSML performance notes — the creative intelligence of the pipeline.",
    border: "border-indigo-500/20",
    glow: "group-hover:shadow-indigo-500/10",
    grad: "from-indigo-500/[0.07] to-violet-500/[0.04]",
  },
  {
    icon: "🎤",
    title: "Expressive Synthesis",
    desc: "Google Cloud TTS receives Gemini-authored SSML so it speaks with the same energy, pace, and emotional emphasis as the original speaker. Different voice, same soul.",
    border: "border-violet-500/20",
    glow: "group-hover:shadow-violet-500/10",
    grad: "from-violet-500/[0.07] to-purple-500/[0.04]",
  },
  {
    icon: "⚡",
    title: "Full Pipeline, One Click",
    desc: "Upload → Gemini analyze → SSML → TTS synthesize → ffmpeg merge. The entire pipeline runs automatically and delivers a download-ready video in under a minute.",
    border: "border-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
    grad: "from-blue-500/[0.07] to-indigo-500/[0.04]",
  },
];

const SAMPLE_JSON = `{
  "overall_tone": "calm and explanatory",
  "pace": "moderate",
  "energy": "medium",
  "emphasis_words": [
    "important", "remember", "key"
  ],
  "ssml_hints": "Speak clearly with slight enthusiasm, pause naturally after key points"
}`;

const TECH = [
  { label: "Gemini 2.5 Flash", sub: "Intelligence Layer" },
  { label: "Google Cloud TTS", sub: "Voice Synthesis" },
  { label: "ADK Agent", sub: "Orchestration" },
  { label: "ffmpeg", sub: "Video Processing" },
];

/* Pre-computed wave bar data (avoids hydration mismatch) */
const WAVE_H = [
  20, 38, 14, 44, 26, 36, 16, 48, 30, 12, 40, 22, 44, 18, 36, 28, 48, 14, 42,
  22, 32, 46, 18, 38, 24, 42, 16, 34, 24, 40,
];
const WAVE_D = [
  1.4, 1.1, 1.6, 0.9, 1.3, 1.8, 1.0, 1.5, 1.2, 1.7, 1.0, 1.4, 0.8, 1.6, 1.3,
  1.1, 0.9, 1.5, 1.2, 1.8, 1.0, 0.8, 1.4, 1.1, 1.6, 1.3, 0.9, 1.2, 1.5, 1.0,
];
const WAVE_DL = [
  0, 0.08, 0.18, 0.06, 0.14, 0.24, 0.04, 0.3, 0.1, 0.22, 0.12, 0.06, 0.26,
  0.18, 0.1, 0.28, 0.04, 0.2, 0.16, 0.08, 0.3, 0.14, 0.06, 0.22, 0.1, 0.28,
  0.18, 0.04, 0.26, 0.12,
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="relative bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-indigo-500/30">

      {/* ─────────────────────────────────────────── Fixed Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#0a0a0a]/70 backdrop-blur-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-black shadow-lg shadow-indigo-500/30 select-none">
            V
          </div>
          <span className="font-bold text-[17px] tracking-tight">
            VoiceSwap<span className="text-indigo-400">.AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#how-it-works"
            className="text-[#666] hover:text-white text-sm font-medium transition-colors hidden sm:block"
          >
            How it works
          </a>
          <Link href="/studio">
            <motion.button
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 28px rgba(99,102,241,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              Open Studio →
            </motion.button>
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────── Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center overflow-hidden">
        {/* Animated background */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden
        >
          <div className="orb-1 absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-indigo-600/[0.06] blur-[130px]" />
          <div className="orb-2 absolute top-1/3 -right-64 w-[650px] h-[650px] rounded-full bg-violet-600/[0.05] blur-[110px]" />
          <div className="orb-3 absolute -bottom-64 -left-64 w-[550px] h-[550px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
          <div className="absolute inset-0 bg-grid" />
          <div
            className="absolute inset-0 hero-vignette"
          />
        </div>

        {/* Content */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center gap-7 max-w-4xl"
        >
          {/* Top badge */}
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] text-indigo-300 text-sm font-medium backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              Powered by Gemini 2.5 Flash · Google Cloud TTS
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-[68px] sm:text-[88px] md:text-[100px] font-black leading-[0.9] tracking-[-0.03em]"
          >
            Swap the voice.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
              Keep the soul.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-[17px] text-[#777] max-w-lg leading-relaxed"
          >
            Replace any voice in your video while preserving emotion, tone, and
            timing.{" "}
            <span className="text-[#999]">
              Gemini analyzes the soul. Google TTS delivers it in a new voice.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-3 mt-1"
          >
            <Link href="/studio">
              <motion.button
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 45px rgba(99,102,241,0.45)",
                }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[15px] transition-colors shadow-[0_0_28px_rgba(99,102,241,0.28)] cursor-pointer"
              >
                Try It Free →
              </motion.button>
            </Link>
            <a href="#how-it-works">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold text-[15px] transition-colors cursor-pointer"
              >
                How it works ↓
              </motion.button>
            </a>
          </motion.div>

          {/* Animated waveform */}
          <motion.div
            variants={fadeUp}
            className="flex items-end gap-[4px] h-14 mt-4"
            aria-hidden
          >
            {WAVE_H.map((h, i) => (
              // eslint-disable-next-line react/forbid-dom-props
              <div
                key={i}
                className="w-[3px] rounded-full wave-bar"
                style={{
                  height: `${h}px`,
                  background: `linear-gradient(to top, rgba(99,102,241,${(
                    0.3 +
                    (h / 96) * 0.5
                  ).toFixed(2)}), rgba(167,139,250,${(
                    0.4 +
                    (h / 96) * 0.4
                  ).toFixed(2)}))`,
                  animationDuration: `${WAVE_D[i]}s`,
                  animationDelay: `${WAVE_DL[i]}s`,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────── Tech strip */}
      <div className="relative border-y border-white/[0.05]">
        <div className="absolute inset-0 bg-white/[0.01]" />
        <div className="relative max-w-4xl mx-auto py-6 px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
          {TECH.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5">
              <span className="text-white/80 font-semibold text-sm">
                {item.label}
              </span>
              <span className="text-[#444] text-[11px] uppercase tracking-widest">
                {item.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────── How It Works */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <InView className="flex flex-col items-center text-center mb-16 gap-3">
            <motion.p
              variants={fadeUp}
              className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]"
            >
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-black tracking-tight"
            >
              Five steps to a new voice
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[#666] text-base max-w-lg"
            >
              The full pipeline from raw video to download — all automatic.
            </motion.p>
          </InView>

          <div className="relative">
            {/* Connecting line between steps */}
            <div className="hidden lg:block absolute top-8 left-[calc(10%+32px)] right-[calc(10%+32px)] h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent pointer-events-none" />

            <InView className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center gap-3.5"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#111] border border-white/[0.07] flex items-center justify-center text-[26px] shadow-lg shadow-black/40">
                      {step.emoji}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-indigo-500/30">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[13px]">
                      {step.title}
                    </p>
                    <p className="text-[#555] text-[12px] mt-1 leading-relaxed max-w-[140px]">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </InView>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── Features */}
      <section className="py-24 px-6 bg-[#080808]">
        <div className="max-w-5xl mx-auto">
          <InView className="flex flex-col items-center text-center mb-16 gap-3">
            <motion.p
              variants={fadeUp}
              className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]"
            >
              Why VoiceSwap
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-black tracking-tight"
            >
              Built different
            </motion.h2>
          </InView>

          <InView className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -5, transition: { duration: 0.22 } }}
                className={`group relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.grad} p-6 overflow-hidden cursor-default transition-shadow duration-300 ${f.glow} hover:shadow-2xl`}
              >
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none card-inner-glow"
                />
                <div className="text-[28px] mb-4">{f.icon}</div>
                <h3 className="text-white font-bold text-base mb-2">
                  {f.title}
                </h3>
                <p className="text-[#666] text-[13px] leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </InView>
        </div>
      </section>

      {/* ─────────────────────────────────────────── AI Brain Section */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <InView>
              <motion.p
                variants={fadeUp}
                className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-3"
              >
                The Intelligence
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-[1.05]"
              >
                Gemini doesn&apos;t just transcribe.
                <br />
                <span className="text-indigo-400">It directs.</span>
              </motion.h2>
              <motion.div variants={stagger} className="flex flex-col gap-4">
                {[
                  {
                    emoji: "📝",
                    title: "Transcribes",
                    desc: "Full text with word-level timestamps.",
                  },
                  {
                    emoji: "🎭",
                    title: "Analyzes emotion",
                    desc: "Tone, energy, pace, and emphasis per segment.",
                  },
                  {
                    emoji: "🎦",
                    title: "Writes SSML",
                    desc: "Tells Google TTS exactly how to perform the text.",
                  },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shrink-0">
                      {item.emoji}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-[14px]">
                        {item.title}
                      </p>
                      <p className="text-[#666] text-[13px] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </InView>

            {/* Right: JSON terminal */}
            <InView>
              <motion.div
                variants={fadeUp}
                className="rounded-2xl border border-indigo-500/20 bg-[#0c0c14] overflow-hidden shadow-2xl shadow-indigo-500/5"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-indigo-500/[0.04]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[#444] text-xs ml-2 font-mono tracking-tight">
                    voice_direction.json
                  </span>
                  <span className="ml-auto text-[10px] text-indigo-400/50 uppercase tracking-widest">
                    Gemini output
                  </span>
                </div>
                <div className="p-5">
                  <pre className="text-[13px] text-indigo-300/90 leading-[1.8] font-mono whitespace-pre-wrap">
                    {SAMPLE_JSON}
                  </pre>
                </div>
                <div className="px-4 py-2.5 border-t border-white/[0.04] bg-indigo-500/[0.03]">
                  <p className="text-[10px] text-indigo-400/50 uppercase tracking-[0.15em] font-medium">
                    Generated by Gemini 2.5 Flash · Drives SSML for Google TTS
                  </p>
                </div>
              </motion.div>
            </InView>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── Final CTA */}
      <section className="py-28 px-6 relative overflow-hidden bg-[#080808]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-600/[0.05] blur-[90px]" />
        </div>
        <InView className="relative max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.07] text-indigo-300 text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Free to try — no account needed
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-black tracking-tight"
          >
            Ready to swap?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-[#666] text-[16px] leading-relaxed max-w-lg"
          >
            Upload a video, let Gemini analyze the emotional soul of the speech,
            and receive it back in a new expressive voice — merged into your video.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/studio">
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 55px rgba(99,102,241,0.45)",
                }}
                whileTap={{ scale: 0.97 }}
                className="px-12 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[16px] transition-colors shadow-[0_0_32px_rgba(99,102,241,0.25)] cursor-pointer"
              >
                Open Studio →
              </motion.button>
            </Link>
          </motion.div>
        </InView>
      </section>

      {/* ─────────────────────────────────────────── Footer */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-black select-none">
              V
            </div>
            <span className="text-white/50 text-sm font-medium">
              VoiceSwap.AI
            </span>
          </div>
          <p className="text-[#333] text-xs text-center">
            Built for the Gemini Live Agent Challenge · All processing is temporary
            &amp; private
          </p>
          <div className="flex items-center gap-3 text-[#333] text-xs">
            <span>Gemini 2.5 Flash</span>
            <span className="text-[#222]">·</span>
            <span>Google Cloud TTS</span>
            <span className="text-[#222]">·</span>
            <span>ADK</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
