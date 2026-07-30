import React, { memo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

// Default weekly mock data derived from current user state if logs are scarce
const defaultStressData = [
  { day: 'Mon', score: 4.2 },
  { day: 'Tue', score: 5.5 },
  { day: 'Wed', score: 6.8 },
  { day: 'Thu', score: 4.0 },
  { day: 'Fri', score: 3.5 },
  { day: 'Sat', score: 2.1 },
  { day: 'Sun', score: 2.8 },
];

const defaultSleepData = [
  { day: 'Mon', hours: 6.5 },
  { day: 'Tue', hours: 7.0 },
  { day: 'Wed', hours: 6.0 },
  { day: 'Thu', hours: 7.5 },
  { day: 'Fri', hours: 8.0 },
  { day: 'Sat', hours: 8.5 },
  { day: 'Sun', hours: 7.2 },
];

const defaultBmiData = [
  { month: 'Jan', bmi: 24.2 },
  { month: 'Feb', bmi: 23.8 },
  { month: 'Mar', bmi: 23.5 },
  { month: 'Apr', bmi: 23.1 },
  { month: 'May', bmi: 22.8 },
  { month: 'Jun', bmi: 22.5 },
];

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 text-white dark:bg-slate-800 dark:text-slate-100 p-2.5 rounded-xl text-xs shadow-xl border border-slate-700/80 font-mono">
        <p className="font-bold text-slate-300">{label}</p>
        <p className="text-blue-400 font-semibold mt-0.5">
          {payload[0].name || 'Value'}: {payload[0].value} {unit}
        </p>
      </div>
    );
  }
  return null;
};

export const WeeklyStressChart = memo(({ data = defaultStressData, currentStress = 5 }) => {
  // If user passed a single current stress score, map it into trend
  const chartData = (data && data.length >= 3) ? data : [
    { day: 'Mon', score: Math.min(10, Math.max(1, currentStress - 1)) },
    { day: 'Tue', score: Math.min(10, Math.max(1, currentStress + 0.5)) },
    { day: 'Wed', score: Math.min(10, Math.max(1, currentStress + 1.2)) },
    { day: 'Thu', score: Math.min(10, Math.max(1, currentStress - 0.5)) },
    { day: 'Fri', score: Number(currentStress) },
  ];

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">
            Mental Wellness
          </span>
          <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
            Weekly Stress Score Trend
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
          1 - 10 Scale
        </span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="/ 10" />} />
            <Area type="monotone" dataKey="score" name="Stress Score" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#stressGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export const SleepHistoryChart = memo(({ data = defaultSleepData, target = 8 }) => {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">
            Sleep Metrics
          </span>
          <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
            Sleep Duration History
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg">
          Target: {target}h
        </span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="hrs" />} />
            <Bar dataKey="hours" name="Sleep Hours" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.hours >= target ? '#10b981' : entry.hours >= 6 ? '#8b5cf6' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export const BmiTrendChart = memo(({ data = defaultBmiData, currentBmi = 22.5 }) => {
  // Ensure current BMI is reflected
  const chartData = (data && data.length >= 3) ? data : [
    { month: 'Jan', bmi: Number(currentBmi) + 1.2 },
    { month: 'Feb', bmi: Number(currentBmi) + 0.8 },
    { month: 'Mar', bmi: Number(currentBmi) + 0.4 },
    { month: 'Apr', bmi: Number(currentBmi) },
  ];

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">
            Body Composition
          </span>
          <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
            BMI Trend & History
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-lg">
          Optimal: 18.5 - 24.9
        </span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[15, 35]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="BMI" />} />
            <Line type="monotone" dataKey="bmi" name="BMI Index" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default function HealthChart({ type = 'stress', data, extraProp }) {
  if (type === 'sleep') return <SleepHistoryChart data={data} target={extraProp} />;
  if (type === 'bmi') return <BmiTrendChart data={data} currentBmi={extraProp} />;
  return <WeeklyStressChart data={data} currentStress={extraProp} />;
}
