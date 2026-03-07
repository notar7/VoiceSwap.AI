"use client";

/**
 * StepUpload — Step 1 of the studio pipeline.
 * Drag-and-drop + click upload zone. Uses XHR for granular progress tracking.
 * Same API call logic as the original VideoUploader — only the UI is redesigned.
 */

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, X, CheckCircle2 } from "lucide-react";
import type { UploadResponse } from "@/types";

interface StepUploadProps {
  onUploadComplete: (data: UploadResponse) => void;
}

type UploaderState = "idle" | "dragging" | "uploading" | "done" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fixed heights used by the upload progress waveform to avoid Math.random()
const WAVE_HEIGHTS = [0.4, 0.75, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.95, 0.45];

export function StepUpload({ onUploadComplete }: StepUploadProps) {
  const [state, setState] = useState<UploaderState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    (f: File) => {
      if (!["video/mp4", "video/quicktime", "video/x-msvideo"].includes(f.type)) {
        setError("Please upload an MP4, MOV, or AVI file.");
        setState("error");
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        setError("File is too large. Maximum is 500 MB.");
        setState("error");
        return;
      }
      setFile(f);
      setError(null);
      setState("uploading");
      setProgress(0);

      const form = new FormData();
      form.append("file", f);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data: UploadResponse = JSON.parse(xhr.responseText);
          setResult(data);
          setState("done");
          onUploadComplete(data);
        } else {
          let detail = "Upload failed. Please try again.";
          try { detail = JSON.parse(xhr.responseText).detail ?? detail; } catch { /* ignore */ }
          setError(detail);
          setState("error");
        }
      });

      xhr.addEventListener("error", () => {
        setError("Network error. Is the backend running on localhost:8000?");
        setState("error");
      });

      xhr.open("POST", `${API_BASE}/upload`);
      xhr.send(form);
    },
    [onUploadComplete]
  );

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setState("dragging"); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setState((s) => s === "dragging" ? "idle" : s); };
  const onDrop      = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f); };

  const reset = () => {
    setState("idle");
    setProgress(0);
    setError(null);
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Upload your video</h2>
        <p className="text-[#555] text-sm">MP4 · MOV · AVI &nbsp;·&nbsp; Max 2 minutes &nbsp;·&nbsp; 500 MB</p>
      </div>

      <input
        ref={inputRef}
        id="video-file-input"
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov,.avi"
        onChange={onFileChange}
        className="hidden"
        aria-label="Upload video file"
        title="Upload video file"
      />

      <AnimatePresence mode="wait">

        {/* ── Idle / Dragging ─────────────────────────────────────────── */}
        {(state === "idle" || state === "dragging") && (
          <motion.div
            key="dropzone"
            id="video-dropzone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative w-full max-w-lg min-h-[240px] rounded-2xl border-2 border-dashed
              cursor-pointer select-none flex flex-col items-center justify-center gap-5 p-10
              transition-all duration-200
              ${state === "dragging"
                ? "border-indigo-400 bg-indigo-500/[0.06] shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                : "border-[#222] hover:border-indigo-500/50 hover:bg-white/[0.01]"
              }
            `}
          >
            <motion.div
              animate={state === "dragging" ? { scale: 1.15, rotate: -6 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex items-center justify-center w-16 h-16 rounded-2xl border transition-colors ${
                state === "dragging" ? "bg-indigo-500/10 border-indigo-500/30" : "bg-[#111] border-[#222]"
              }`}
            >
              <Film className={`w-7 h-7 transition-colors ${state === "dragging" ? "text-indigo-400" : "text-[#444]"}`} />
            </motion.div>

            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">
                {state === "dragging" ? "Drop it here" : "Drag & drop your video"}
              </p>
              <p className="text-[#555] text-sm">
                or{" "}
                <span className="text-indigo-400 underline underline-offset-2">click to browse</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Uploading ────────────────────────────────────────────────── */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-8 flex flex-col gap-6"
          >
            {/* Animated waveform — scaleY avoids inline style height */}
            <div className="flex items-end justify-center gap-1.5 h-10">
              {WAVE_HEIGHTS.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-indigo-500 origin-bottom"
                  animate={{ scaleY: [h * 0.4, h, h * 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
                  style={{ height: "40px" }}
                />
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111] border border-[#1a1a1a] flex-shrink-0">
                <Film className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{file?.name}</p>
                <p className="text-[#444] text-xs">{file ? formatBytes(file.size) : ""}</p>
              </div>
              <span className="text-indigo-400 text-sm font-bold">{progress}%</span>
            </div>

            <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {state === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: "spring" }}
            className="w-full rounded-2xl border border-green-500/20 bg-green-500/[0.04] p-8 flex flex-col items-center gap-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
            >
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">Video uploaded!</p>
              <p className="text-[#555] text-sm truncate max-w-[280px]">{result.filename}</p>
            </div>
            <div className="flex items-center gap-3">
              {result.duration != null && result.duration > 0 && (
                <span className="px-3 py-1 rounded-full bg-[#111] border border-[#1a1a1a] text-[#666] text-xs">
                  ⏱ {formatDuration(result.duration)}
                </span>
              )}
              {file && (
                <span className="px-3 py-1 rounded-full bg-[#111] border border-[#1a1a1a] text-[#666] text-xs">
                  💾 {formatBytes(file.size)}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
                Audio extracted ✓
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 flex flex-col items-center gap-4"
          >
            <X className="w-10 h-10 text-red-400" />
            <div className="text-center">
              <p className="text-white font-semibold text-base mb-1">Upload failed</p>
              <p className="text-red-400 text-sm max-w-[320px] leading-relaxed">{error}</p>
            </div>
            <button
              id="retry-upload-btn"
              onClick={reset}
              className="px-5 py-2 rounded-xl bg-[#111] border border-[#222] text-white text-sm hover:border-indigo-500/50 transition-all"
            >
              Try again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
