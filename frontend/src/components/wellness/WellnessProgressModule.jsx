import React from 'react';
import {
  Target,
  Footprints,
  Droplets,
  Moon,
  Dumbbell,
  HeartPulse,
  Scale,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

const statusMeta = {
  'Excellent': { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
  'Good': { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
  'Fair': { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
  'Needs Attention': { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800' },
};

const GoalBar = ({ label, icon: Icon, value, target, suffix = '', iconColor }) => {
  const pct = value <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {label}
        </span>
        <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">
          {value.toLocaleString()}{suffix} / {target.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${iconColor.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const VitalsChip = ({ label, value, icon: Icon, unit }) => (
  <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 text-center">
    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
    <div className="text-sm font-display font-bold text-slate-800 dark:text-slate-100">
      {value} <span className="text-[10px] font-light text-slate-400 font-mono">{unit}</span>
    </div>
  </div>
);
const overallColor = (pct) => ({
  stroke: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
  strokeWidth: 7,
});

export default function WellnessProgressModule({
  healthScore = 88,
  riskScore = 25,
  bmi = 22,
  bp = '120/80',
  glucoseLevel = '90',
  stressScore = 5,
  sleepHours = 7.5,
  exerciseDays = 0,
  exerciseHours = 0,
  waterCups = 0,
  stepsCount = 0,
  streakDays = 0,
  healthAssessment = null
}) {
  const status = healthAssessment
    || (riskScore >= 70 ? 'Needs Attention' : riskScore >= 45 ? 'Fair' : riskScore >= 30 ? 'Good' : 'Excellent');
  const statusStyle = statusMeta[status] || statusMeta['Good'];

  const goalPercentages = [
    Math.min(100, Math.round((stepsCount / 10000) * 100)),
    Math.min(100, Math.round((waterCups / 8) * 100)),
    Math.min(100, Math.round((exerciseDays / 7) * 100)),
  ];
  const overall = Math.round(goalPercentages.reduce((a, b) => a + b, 0) / goalPercentages.length);
  const overallStroke = overallColor(overall);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-400" /> Wellness Progress
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Your daily goals &amp; vitals snapshot
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusStyle.bg} ${statusStyle.color}`}>
          {status === 'Excellent' || status === 'Good'
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <AlertTriangle className="w-3.5 h-3.5" />}
          {status}
        </span>
      </div>

      {/* Overall progress ring */}
      <div className="flex items-center gap-4 mb-5 p-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" strokeWidth="7" className="stroke-slate-100 dark:stroke-slate-700/60" />
            <circle
              cx="32" cy="32" r="27" fill="none" strokeLinecap="round"
              stroke={overallStroke.stroke} strokeWidth={overallStroke.strokeWidth}
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-bold text-lg text-slate-800 dark:text-slate-100 leading-none">{healthScore}%</span>
            <span className="text-[9px] font-mono text-slate-400">Health</span>
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {overall >= 80 ? 'Excellent progress' : overall >= 50 ? 'Good progress' : 'Keep it up'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            You've completed <span className="font-bold text-slate-700 dark:text-slate-200">{overall}%</span> of today's
            wellness goals. Current streak: <span className="font-bold text-slate-700 dark:text-slate-200">{streakDays} days</span>.
          </p>
        </div>
      </div>

      {/* Daily goal progress bars */}
      <div className="space-y-4 mb-5">
        <GoalBar label="Daily Steps" icon={Footprints} value={stepsCount} target={10000} iconColor="text-emerald-500 dark:text-emerald-400" />
        <GoalBar label="Hydration" icon={Droplets} value={waterCups} target={8} suffix=" cups" iconColor="text-blue-500 dark:text-blue-400" />
        <GoalBar label="Exercise" icon={Dumbbell} value={exerciseDays} target={7} suffix=" days" iconColor="text-amber-500 dark:text-amber-400" />
      </div>

      {/* Key vitals snapshot */}
      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 font-mono">
        Vitals Snapshot
      </h4>
      <div className="grid grid-cols-3 gap-2.5">
        <VitalsChip label="BMI" value={bmi} icon={Scale} />
        <VitalsChip label="BP" value={bp} icon={HeartPulse} />
        <VitalsChip label="Glucose" value={glucoseLevel} icon={Activity} unit="mg/dL" />
        <VitalsChip label="Stress" value={`${stressScore}`} icon={Brain} unit="/10" />
        <VitalsChip label="Exercise" value={exerciseHours} icon={Dumbbell} unit="hrs/wk" />
        <VitalsChip label="Sleep" value={sleepHours} icon={Moon} unit="hrs" />
      </div>
    </div>
  );
}