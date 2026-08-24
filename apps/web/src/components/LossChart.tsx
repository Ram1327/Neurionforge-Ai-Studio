"use client";

import React from "react";
import { LossDataPoint } from "@/hooks/useFineTuneJob";

interface LossChartProps {
  data: LossDataPoint[];
  height?: number;
}

export function LossChart({ data, height = 180 }: LossChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[rgba(238,242,248,0.08)] bg-[#07090d]/60 p-6 text-center font-mono text-xs text-[#8a93a3]"
        style={{ height }}
      >
        <div className="h-2 w-2 rounded-full bg-[#4c8dff]/40 animate-ping mb-2" />
        <span>Awaiting training step loss measurements...</span>
      </div>
    );
  }

  const padding = { top: 20, right: 30, bottom: 25, left: 45 };
  const width = 500; // viewBox width

  const losses = data.map((d) => d.loss);
  const minLoss = Math.max(0, Math.min(...losses) * 0.85);
  const maxLoss = Math.max(...losses) * 1.15 || 1.0;
  const lossRange = maxLoss - minLoss || 1.0;

  const minStep = data[0].step;
  const maxStep = data[data.length - 1].step || 1;
  const stepRange = Math.max(1, maxStep - minStep);

  const getX = (step: number) => {
    if (data.length === 1) return padding.left + (width - padding.left - padding.right) / 2;
    return padding.left + ((step - minStep) / stepRange) * (width - padding.left - padding.right);
  };

  const getY = (loss: number) => {
    return height - padding.bottom - ((loss - minLoss) / lossRange) * (height - padding.top - padding.bottom);
  };

  // Generate SVG polyline points
  const points = data.map((d) => `${getX(d.step)},${getY(d.loss)}`).join(" ");

  // Generate area under curve path
  const firstX = getX(data[0].step);
  const lastX = getX(data[data.length - 1].step);
  const baseY = height - padding.bottom;
  const areaPath = `M ${firstX},${baseY} L ${points.replace(/ /g, " L ")} L ${lastX},${baseY} Z`;

  const latestPoint = data[data.length - 1];
  const latestX = getX(latestPoint.step);
  const latestY = getY(latestPoint.loss);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[rgba(238,242,248,0.08)] bg-[#07090d]/80 p-3">
      <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-mono text-[#8a93a3]">
        <div className="flex items-center space-x-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4c8dff]" />
          <span className="text-[#eef2f8] font-semibold">Training Loss Curve</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Min: <strong className="text-[#9fe0ff]">{Math.min(...losses).toFixed(4)}</strong></span>
          <span>Latest: <strong className="text-[#4c8dff]">{latestPoint.loss.toFixed(4)}</strong></span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible font-mono text-[10px]"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4c8dff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4c8dff" stopOpacity="0.0" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines & Y-axis labels */}
        {[0, 0.5, 1].map((ratio) => {
          const val = minLoss + ratio * lossRange;
          const y = height - padding.bottom - ratio * (height - padding.top - padding.bottom);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(238, 242, 248, 0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fill="#8a93a3"
                textAnchor="end"
                fontSize="9"
              >
                {val.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#lossGradient)" />

        {/* Loss line */}
        <polyline
          fill="none"
          stroke="#4c8dff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          filter="url(#glow)"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(d.step)}
            cy={getY(d.loss)}
            r={data.length > 30 ? 1.5 : 2.5}
            fill="#9fe0ff"
            className="transition-all"
          />
        ))}

        {/* Active glowing cursor on latest point */}
        <circle
          cx={latestX}
          cy={latestY}
          r="5"
          fill="#9fe0ff"
          stroke="#4c8dff"
          strokeWidth="2"
          className="animate-pulse"
        />

        {/* X-axis start and end labels */}
        <text
          x={padding.left}
          y={height - 6}
          fill="#8a93a3"
          textAnchor="start"
          fontSize="9"
        >
          Step {minStep}
        </text>
        <text
          x={width - padding.right}
          y={height - 6}
          fill="#8a93a3"
          textAnchor="end"
          fontSize="9"
        >
          Step {maxStep}
        </text>
      </svg>
    </div>
  );
}
