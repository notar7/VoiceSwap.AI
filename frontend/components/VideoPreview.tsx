"use client";

import { useRef } from "react";

interface VideoPreviewProps {
    videoUrl: string;
    downloadUrl: string;
    label?: string;
    filename?: string;
}

export function VideoPreview({
    videoUrl,
    downloadUrl,
    label = "Processed Video",
    filename = "voiceswap_output.mp4",
}: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    return (
        <div className="w-full rounded-2xl border border-[#222] bg-[#111] overflow-hidden">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full bg-black max-h-[400px]"
            />
            <div className="p-4 flex items-center justify-between border-t border-[#1e1e1e]">
                <span className="text-sm text-[#555]">{label}</span>
                <a
                    href={downloadUrl}
                    download={filename}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all duration-200 shadow-[0_0_16px_rgba(34,197,94,0.2)]"
                >
                    ⬇ Download
                </a>
            </div>
        </div>
    );
}
