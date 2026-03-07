"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { UploadResponse } from "@/types";

interface VideoUploaderProps {
    onUploadComplete: (data: UploadResponse) => void;
}

type UploaderState = "idle" | "dragging" | "uploading" | "done" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const ALLOWED_EXT_LABEL = "MP4 or MOV";

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
    const [state, setState] = useState<UploaderState>("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [result, setResult] = useState<UploadResponse | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return `Unsupported file type. Please upload an ${ALLOWED_EXT_LABEL} file.`;
        }
        if (file.size > 500 * 1024 * 1024) {
            // 500 MB safety guard client-side (2 min video is usually well under this)
            return "File is too large. Maximum size is 500 MB.";
        }
        return null;
    };

    const uploadFile = useCallback(
        (file: File) => {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                setState("error");
                return;
            }

            setUploadedFile(file);
            setError(null);
            setState("uploading");
            setProgress(0);

            const form = new FormData();
            form.append("file", file);

            // Use XMLHttpRequest so we get granular upload progress events
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    setProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data: UploadResponse = JSON.parse(xhr.responseText);
                    setResult(data);
                    setState("done");
                    onUploadComplete(data);
                } else {
                    let detail = "Upload failed. Please try again.";
                    try {
                        const err = JSON.parse(xhr.responseText);
                        detail = err.detail ?? detail;
                    } catch { }
                    setError(detail);
                    setState("error");
                }
            });

            xhr.addEventListener("error", () => {
                setError("Network error. Is the backend running?");
                setState("error");
            });

            xhr.open("POST", `${API_BASE}/upload`);
            xhr.send(form);
        },
        [onUploadComplete]
    );

    // ── Drag-and-drop handlers ────────────────────────────────────────────────

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setState("dragging");
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setState("idle");
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) uploadFile(file);
        },
        [uploadFile]
    );

    const onFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
        },
        [uploadFile]
    );

    const reset = () => {
        setState("idle");
        setProgress(0);
        setError(null);
        setUploadedFile(null);
        setResult(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="w-full max-w-xl mx-auto">
            <AnimatePresence mode="wait">
                {/* ── Idle / Dragging ─────────────────────────────────────────── */}
                {(state === "idle" || state === "dragging") && (
                    <motion.div
                        key="dropzone"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => inputRef.current?.click()}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        id="video-dropzone"
                        className={`
              group relative flex flex-col items-center justify-center gap-5
              w-full min-h-[280px] rounded-2xl border-2 border-dashed
              cursor-pointer transition-all duration-200 select-none p-10
              ${state === "dragging"
                                ? "border-indigo-400 bg-indigo-500/5 scale-[1.01]"
                                : "border-[#222] hover:border-indigo-500/60 hover:bg-white/[0.02]"
                            }
            `}
                    >
                        {/* Glow on drag */}
                        {state === "dragging" && (
                            <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 pointer-events-none" />
                        )}

                        <div
                            className={`
              flex items-center justify-center w-20 h-20 rounded-2xl
              bg-[#111] border border-[#222] transition-transform duration-200
              ${state === "dragging" ? "scale-110" : "group-hover:scale-105"}
            `}
                        >
                            <span className="text-4xl">🎬</span>
                        </div>

                        <div className="text-center">
                            <p className="text-white font-semibold text-lg mb-1">
                                {state === "dragging"
                                    ? "Drop your video here"
                                    : "Upload your video"}
                            </p>
                            <p className="text-[#888] text-sm">
                                Drag & drop or{" "}
                                <span className="text-indigo-400 underline underline-offset-2">
                                    click to browse
                                </span>
                            </p>
                            <p className="text-[#555] text-xs mt-2">
                                {ALLOWED_EXT_LABEL} · max 2 minutes
                            </p>
                        </div>

                        <input
                            ref={inputRef}
                            type="file"
                            accept="video/mp4,video/quicktime,.mp4,.mov"
                            onChange={onFileChange}
                            className="hidden"
                            id="video-file-input"
                            aria-label="Upload video file"
                        />
                    </motion.div>
                )}

                {/* ── Uploading ───────────────────────────────────────────────── */}
                {state === "uploading" && (
                    <motion.div
                        key="uploading"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-6 w-full min-h-[280px] justify-center rounded-2xl border border-[#222] bg-[#111] p-10"
                    >
                        {/* Animated waveform icon */}
                        <div className="flex items-end gap-1 h-12">
                            {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 rounded-full bg-indigo-400"
                                    animate={{ scaleY: [h * 0.5, h, h * 0.5] }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                        ease: "easeInOut",
                                    }}
                                    style={{ height: "48px", transformOrigin: "bottom" }}
                                />
                            ))}
                        </div>

                        <div className="text-center">
                            <p className="text-white font-semibold text-base mb-0.5">
                                Uploading
                            </p>
                            {uploadedFile && (
                                <p className="text-[#888] text-sm truncate max-w-[280px]">
                                    {uploadedFile.name}
                                </p>
                            )}
                        </div>

                        <div className="w-full space-y-2">
                            <Progress value={progress} className="h-1.5 bg-[#222]" />
                            <p className="text-center text-indigo-400 text-sm font-medium">
                                {progress}%
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Done ────────────────────────────────────────────────────── */}
                {state === "done" && result && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                        className="flex flex-col items-center gap-6 w-full min-h-[280px] justify-center rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-10"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30"
                        >
                            <span className="text-3xl">✅</span>
                        </motion.div>

                        <div className="text-center">
                            <p className="text-white font-semibold text-lg mb-1">
                                Video uploaded!
                            </p>
                            <p
                                className="text-[#888] text-sm truncate max-w-[280px] mx-auto"
                                title={result.filename}
                            >
                                {result.filename}
                            </p>
                        </div>

                        {/* Metadata pills */}
                        <div className="flex items-center gap-3">
                            {result.duration != null && result.duration > 0 && (
                                <span className="px-3 py-1 rounded-full bg-[#111] border border-[#222] text-[#888] text-xs font-medium">
                                    ⏱ {formatDuration(result.duration)}
                                </span>
                            )}
                            {uploadedFile && (
                                <span className="px-3 py-1 rounded-full bg-[#111] border border-[#222] text-[#888] text-xs font-medium">
                                    💾 {formatBytes(uploadedFile.size)}
                                </span>
                            )}
                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                                Audio extracted
                            </span>
                        </div>

                        <button
                            onClick={reset}
                            className="text-[#555] text-xs hover:text-[#888] transition-colors underline underline-offset-2 mt-2"
                        >
                            Upload a different video
                        </button>
                    </motion.div>
                )}

                {/* ── Error ───────────────────────────────────────────────────── */}
                {state === "error" && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-6 w-full min-h-[280px] justify-center rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-10"
                    >
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30">
                            <span className="text-3xl">❌</span>
                        </div>

                        <div className="text-center">
                            <p className="text-white font-semibold text-lg mb-2">
                                Upload failed
                            </p>
                            <p className="text-[#ef4444] text-sm max-w-[320px] mx-auto leading-relaxed">
                                {error}
                            </p>
                        </div>

                        <button
                            onClick={reset}
                            id="retry-upload-btn"
                            className="px-6 py-2.5 rounded-xl bg-[#111] border border-[#222] text-white text-sm font-medium hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all duration-200"
                        >
                            Try again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
