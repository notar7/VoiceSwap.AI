import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "VoiceSwap.AI — Swap the Voice. Keep the Soul.",
  description:
    "Swap the voice. Keep the soul. AI-powered voice replacement that preserves emotion, tone, and timing — powered by Gemini 2.5 Flash.",
  keywords: [
    "VoiceSwap.AI",
    "voice swap",
    "AI voice director",
    "Gemini",
    "video",
    "text-to-speech",
    "emotion-preserving",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}