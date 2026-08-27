"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/** Four-point sparkle in a Gemini-like shifting gradient. */
export function GeminiSparkIcon({ className }: { className?: string }) {
  const rawId = useId().replace(/:/g, "");
  const fillId = `gemini-fill-${rawId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id={fillId} x1="2" y1="2" x2="22" y2="22">
          <stop offset="0%" stopColor="#1A73E8">
            <animate
              attributeName="stop-color"
              values="#1A73E8;#A142F4;#E5457A;#F9AB00;#34A853;#1A73E8"
              dur="5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#A142F4">
            <animate
              attributeName="stop-color"
              values="#A142F4;#E5457A;#F9AB00;#34A853;#1A73E8;#A142F4"
              dur="5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#E5457A">
            <animate
              attributeName="stop-color"
              values="#E5457A;#F9AB00;#34A853;#1A73E8;#A142F4;#E5457A"
              dur="5s"
              repeatCount="indefinite"
            />
          </stop>
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="8s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${fillId})`}
        d="M12 1.6c.18 4.7 1.7 7.05 6.4 8.4-4.7 1.35-6.22 3.7-6.4 8.4-.18-4.7-1.7-7.05-6.4-8.4 4.7-1.35 6.22-3.7 6.4-8.4Z"
      />
      <path
        fill={`url(#${fillId})`}
        opacity="0.9"
        d="M19.2 3.4c.08 1.7.62 2.55 2.3 3.05-1.68.5-2.22 1.35-2.3 3.05-.08-1.7-.62-2.55-2.3-3.05 1.68-.5 2.22-1.35 2.3-3.05Z"
      />
    </svg>
  );
}

/** Live-search lamp with expanding radar rings. */
export function LiveSearchLamp({ className }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      aria-hidden
    >
      <span className="absolute h-8 w-8 rounded-full border border-emerald-400/55 animate-[live-ring_2.2s_ease-out_infinite]" />
      <span className="absolute h-8 w-8 rounded-full border border-emerald-400/40 animate-[live-ring_2.2s_ease-out_infinite_0.7s]" />
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-emerald-400/70 blur-[3px]" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />
      </span>
    </span>
  );
}
