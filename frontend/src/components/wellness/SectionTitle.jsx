import React from 'react';

export default function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeColor = 'blue'
}) {
  const badgeStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
  };

  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4 mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {badge && (
        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider font-mono ${badgeStyles[badgeColor] || badgeStyles.blue}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
