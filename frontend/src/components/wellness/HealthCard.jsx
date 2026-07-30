import React from 'react';
import CircularHealthScore from './CircularHealthScore';
import { Heart, Activity, Moon, ShieldAlert, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

export default function HealthCard({
  riskScore = 0,
  factors = [],
  healthScore = 88,
  bmi = 22,
  bp = "120/80",
  sleepHours = 7.5
}) {
  // Compute health status indicators based on user vitals
  const getBmiCategory = (bmiVal) => {
    const val = Number(bmiVal) || 22;
    if (val < 18.5) return { label: 'Underweight', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', pct: 40 };
    if (val <= 24.9) return { label: 'Normal Weight', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', pct: 90 };
    if (val <= 29.9) return { label: 'Overweight', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', pct: 65 };
    return { label: 'Obese', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40', pct: 35 };
  };

  const getHeartHealth = (bpStr) => {
    const [sys] = (bpStr || "120/80").split('/').map(Number);
    if (!sys || sys <= 120) return { label: 'Normal (Optimal)', color: 'text-emerald-500', pct: 95 };
    if (sys <= 130) return { label: 'Elevated', color: 'text-amber-500', pct: 75 };
    if (sys <= 140) return { label: 'Stage 1 HTN', color: 'text-orange-500', pct: 55 };
    return { label: 'Stage 2 HTN', color: 'text-rose-500', pct: 30 };
  };

  const getSleepQuality = (hrs) => {
    const val = Number(hrs) || 7.5;
    if (val >= 7 && val <= 9) return { label: 'Optimal Rest', color: 'text-emerald-500', pct: 92 };
    if (val >= 6) return { label: 'Moderate Rest', color: 'text-amber-500', pct: 70 };
    return { label: 'Sleep Deprived', color: 'text-rose-500', pct: 45 };
  };

  const bmiCategory = getBmiCategory(bmi);
  const heartHealth = getHeartHealth(bp);
  const sleepQuality = getSleepQuality(sleepHours);

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6">
      {/* Diagnostics Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-base">
              Health Diagnostics Panel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Real-time vitals analytics & risk computation
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
          riskScore >= 70
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
            : riskScore >= 45
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
        }`}>
          {riskScore >= 70 ? 'High Risk Alert' : riskScore >= 45 ? 'Elevated Stress' : 'Vitals Optimal'}
        </span>
      </div>

      {/* Main Score Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Circular Health Score */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 flex flex-col items-center justify-center">
          <CircularHealthScore score={healthScore} size={130} strokeWidth={9} title="Health Index" subtitle="Synced Live" />
        </div>

        {/* Burnout Risk Card */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono font-bold">
              Burnout Risk Index
            </span>
            <span className="inline-flex items-center text-[10px] text-slate-400 font-mono">
              {riskScore >= 50 ? <TrendingUp className="w-3 h-3 text-rose-500 mr-1" /> : <TrendingDown className="w-3 h-3 text-emerald-500 mr-1" />}
              {riskScore}%
            </span>
          </div>

          <div className="text-3xl font-display font-bold text-slate-900 dark:text-slate-50">
            {riskScore}%
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                riskScore >= 70 ? 'bg-rose-500' : riskScore >= 45 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(5, riskScore)}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {riskScore >= 70 ? 'High probability of fatigue' : riskScore >= 45 ? 'Moderate mental workload' : 'Low stress / High resilience'}
          </p>
        </div>
      </div>

      {/* Progress Bars for Detailed Vitals */}
      <div className="space-y-3.5 pt-2">
        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">
          Detailed Vitals Breakdown
        </h4>

        {/* Heart Health */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> Heart Health (BP: {bp})
            </span>
            <span className={`font-mono text-[11px] font-bold ${heartHealth.color}`}>
              {heartHealth.label}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${heartHealth.pct}%` }} />
          </div>
        </div>

        {/* BMI Category */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-blue-500" /> BMI Index ({bmi})
            </span>
            <span className={`font-mono text-[11px] font-bold ${bmiCategory.color}`}>
              {bmiCategory.label}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${bmiCategory.pct}%` }} />
          </div>
        </div>

        {/* Sleep Quality */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Moon className="w-3.5 h-3.5 text-purple-500" /> Sleep Quality ({sleepHours}h)
            </span>
            <span className={`font-mono text-[11px] font-bold ${sleepQuality.color}`}>
              {sleepQuality.label}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${sleepQuality.pct}%` }} />
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono block">
          Contributing Factors:
        </span>
        {factors.length === 0 || (factors.length === 1 && factors[0] === "Awaiting data...") ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-light flex items-center gap-1.5 py-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            All parameters verified within optimal limits. Maintain good health routine!
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {factors.map((f, i) => (
              <span key={i} className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] rounded-lg font-mono font-medium">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Trigger */}
      <div className="pt-2">
        {riskScore >= 70 ? (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">PTO Advisory Triggered!</strong>
              Your metrics indicate severe physical fatigue. We recommend taking advantage of wellness PTO benefits immediately.
            </div>
          </div>
        ) : riskScore >= 45 ? (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Elevated Baseline Stress</strong>
              Try incorporating daily breathing micro-breaks during work sprints to normalize cortisol indicators.
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Vitals Optimal</strong>
              Great work! Your exercise levels and resting intervals place you in the low-risk optimal health tier.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
