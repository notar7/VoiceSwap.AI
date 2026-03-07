"use client";

/**
 * AnimatedBackground — three softly drifting gradient orbs + subtle grid.
 * Fixed behind all content via z-index. No inline styles — animations are
 * driven by CSS keyframes defined in globals.css.
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Indigo orb — top left */}
      <div className="anim-orb-1 absolute -top-48 left-[5%] w-[700px] h-[700px] rounded-full bg-indigo-600/[0.07] blur-[130px]" />

      {/* Purple orb — right */}
      <div className="anim-orb-2 absolute top-[25%] -right-36 w-[550px] h-[550px] rounded-full bg-purple-700/[0.05] blur-[120px]" />

      {/* Deep indigo orb — bottom center */}
      <div className="anim-orb-3 absolute -bottom-24 left-[35%] w-[450px] h-[450px] rounded-full bg-indigo-900/[0.06] blur-[100px]" />
    </div>
  );
}
