import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  trend,
  trendUp = true,
  icon: Icon,
  color = 'blue'
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50',
      accent: 'from-blue-500 to-indigo-600',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50',
      accent: 'from-emerald-500 to-teal-600',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50',
      accent: 'from-amber-500 to-orange-600',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50',
      accent: 'from-purple-500 to-violet-600',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/50',
      accent: 'from-rose-500 to-pink-600',
    }
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="relative group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Top accent bar on hover */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${selectedColor.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              {value}
            </span>
          </div>
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl border ${selectedColor.iconBg} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        {trend && (
          <span className={`inline-flex items-center gap-1 font-semibold font-mono text-[11px] ${
            trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
        {subtext && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
