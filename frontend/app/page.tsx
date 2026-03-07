"use client";

/**
 * Landing page — VoiceSwap.AI
 * Hero section, features grid, footer.
 * "Get Started" navigates to /studio.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { Mic, Brain, Shield, Download, ArrowRight } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const FEATURES = [
  {
    Icon: Brain,
    title: "Gemini AI Analysis",
    description:
      "Gemini 2.5 Flash transcribes speech and analyzes emotion, tone, pace, and emphasis — then directs the new voice performance.",
  },
  {
    Icon: Shield,
    title: "Emotion Preserved",
    description:
      "The synthesized voice doesn't just read words — it performs them. Stress, pauses, and energy are recreated via structured SSML.",
  },
  {
    Icon: Mic,
    title: "8 Premium Voices",
    description:
      "Choose from 8 Neural2 voices across American, British, and Indian accents — male and female — powered by Google Cloud TTS.",
  },
  {
    Icon: Download,
    title: "Instant Download",
    description:
      "Get your finished video in seconds. Original video quality is preserved — only the audio track is replaced using ffmpeg.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AnimatedBackground />

      {/* ── Sticky Navbar ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-10 h-16 border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            VoiceSwap<span className="text-indigo-400">.AI</span>
          </span>
        </div>
        <Link href="/studio">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Get Started
          </motion.button>
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 max-w-3xl mx-auto"
        >
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
            />
            Powered by Gemini 2.5 Flash + Google Cloud TTS
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-bold tracking-tight text-white leading-tight">
            Replace Any Voice.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Keep Every Emotion.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#555] text-xl max-w-xl mx-auto leading-relaxed">
            Upload your video, pick a voice, let Gemini analyze and recreate the performance — perfectly synced.
          </p>

          {/* CTA */}
          <Link href="/studio">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 48px rgba(99,102,241,0.45)" }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 px-9 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-base shadow-[0_0_28px_rgba(99,102,241,0.3)] transition-all mt-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 pb-24 flex justify-center px-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.45 }}
                className="flex flex-col gap-5 p-7 rounded-2xl border border-[#161616] bg-[#0c0c0c] hover:border-indigo-500/25 transition-colors duration-200"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <f.Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base mb-2">{f.title}</p>
                  <p className="text-[#555] text-sm leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#111] py-12 flex flex-col items-center px-8">
        <div className="w-full max-w-6xl flex items-start justify-between gap-8">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
                <Mic className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-sm">
                VoiceSwap<span className="text-indigo-400">.AI</span>
              </span>
            </div>
            <p className="text-[#333] text-xs">AI-powered voice replacement for video creators</p>
          </div>

          {/* Built with */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[#2a2a2a] text-xs uppercase tracking-widest">Built with</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#555] text-xs">
                Gemini 2.5 Flash
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#555] text-xs">
                Google Cloud TTS
              </span>
            </div>
          </div>

          {/* Hackathon */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-[#2a2a2a] text-xs uppercase tracking-widest">Built for</p>
            <p className="text-[#444] text-xs font-medium">Gemini Live Agent Challenge 2026</p>
          </div>

        </div>

        <div className="w-full max-w-6xl mt-10 pt-6 border-t border-[#111]">
          <p className="text-[#333] text-xs text-center">© 2026 VoiceSwap.AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
