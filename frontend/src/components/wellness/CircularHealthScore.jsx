import React from 'react';

export default function CircularHealthScore({
  score = 85,
  size = 140,
  strokeWidth = 10,
  title = "Health Score",
  subtitle = "Overall Wellbeing"
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  let colorClass = "stroke-emerald-500 text-emerald-600 dark:text-emerald-400";
  let statusBadge = "Optimal";
  let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800";

  if (normalizedScore < 50) {
    colorClass = "stroke-rose-500 text-rose-600 dark:text-rose-400";
    statusBadge = "Needs Attention";
    statusBg = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800";
  } else if (normalizedScore < 75) {
    colorClass = "stroke-amber-500 text-amber-600 dark:text-amber-400";
    statusBadge = "Moderate";
    statusBg = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800";
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-slate-100 dark:stroke-slate-700/60 fill-none"
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`fill-none transition-all duration-1000 ease-out ${colorClass}`}
          />
        </svg>

        {/* Center Label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            {normalizedScore}%
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono font-medium mt-0.5">
            {title}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
          {statusBadge}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-400 font-mono">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
