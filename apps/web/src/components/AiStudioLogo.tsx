"use client";

import React, { useId } from "react";

interface AiStudioLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function AiStudioLogo({
  className = "shrink-0",
  width = 38,
  height = 30,
}: AiStudioLogoProps) {
  const id = useId().replace(/:/g, "_");
  const gradId = `ngfStudioGrad_${id}`;
  const clipId = `ngfStudioClip_${id}`;
  const highlightId = `ngfStudioHighlight_${id}`;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 169 127"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NeurionForge AI Studio Logo"
    >
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1="22"
          y1="98"
          x2="146"
          y2="10"
        >
          <stop offset="0%" stopColor="#12213F" />
          <stop offset="38%" stopColor="#1E3E8C" />
          <stop offset="68%" stopColor="#3B6FE0" />
          <stop offset="100%" stopColor="#8FCBFF" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M 32.00 46.60 L 32.00 84.00 L 39.50 84.00 L 47.00 84.00 L 47.20 69.20 C 47.40 51.10 47.50 50.20 48.20 49.50 C 48.50 49.20 61.40 61.80 76.80 77.60 L 105.00 106.20 L 105.20 76.90 L 105.50 47.60 L 122.20 37.10 L 139.00 26.50 L 139.00 17.60 C 139.00 9.90 138.80 8.90 137.40 9.40 C 136.00 9.90 104.40 29.20 92.80 36.60 L 89.00 39.00 L 89.00 52.80 L 89.00 66.50 L 60.50 37.90 L 32.00 9.20 L 32.00 46.60 Z" />
          <path d="M 127.00 47.50 C 124.00 49.30 118.20 52.80 114.30 55.20 C 110.30 57.60 107.00 59.80 107.00 60.10 C 107.00 60.70 123.70 65.30 130.80 66.60 L 134.00 67.20 L 134.00 55.60 C 134.00 49.20 133.70 44.00 133.30 44.00 C 132.80 44.10 130.00 45.60 127.00 47.50 Z" />
        </clipPath>
        <radialGradient
          id={highlightId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(118 22) rotate(45) scale(55 40)"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        d="M 32.00 46.60 L 32.00 84.00 L 39.50 84.00 L 47.00 84.00 L 47.20 69.20 C 47.40 51.10 47.50 50.20 48.20 49.50 C 48.50 49.20 61.40 61.80 76.80 77.60 L 105.00 106.20 L 105.20 76.90 L 105.50 47.60 L 122.20 37.10 L 139.00 26.50 L 139.00 17.60 C 139.00 9.90 138.80 8.90 137.40 9.40 C 136.00 9.90 104.40 29.20 92.80 36.60 L 89.00 39.00 L 89.00 52.80 L 89.00 66.50 L 60.50 37.90 L 32.00 9.20 L 32.00 46.60 Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M 127.00 47.50 C 124.00 49.30 118.20 52.80 114.30 55.20 C 110.30 57.60 107.00 59.80 107.00 60.10 C 107.00 60.70 123.70 65.30 130.80 66.60 L 134.00 67.20 L 134.00 55.60 C 134.00 49.20 133.70 44.00 133.30 44.00 C 132.80 44.10 130.00 45.60 127.00 47.50 Z"
        fill={`url(#${gradId})`}
      />

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="169" height="127" fill={`url(#${highlightId})`} />
      </g>
    </svg>
  );
}
