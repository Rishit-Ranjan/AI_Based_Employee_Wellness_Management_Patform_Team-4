import React, { useMemo } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Bed, Droplets, Footprints } from 'lucide-react';

const Insight = ({ icon: Icon, color, title, text }) => (
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color.bg}`}>
      <Icon className={`w-4 h-4 ${color.text}`} />
    </div>
    <div>
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{text}</p>
    </div>
  </div>
);

export default function WellnessInsightsModule({ records = [], dailyHabits = [], mentalHealthLogs = [] }) {
  const insights = useMemo(() => {
    const generatedInsights = [];
    const record = records.find(r => r.employeeId) || {};
    const habit = dailyHabits.find(h => h.employeeId) || {};
    const logs = mentalHealthLogs || [];

    // 1. Sleep Insight
    const sleepHours = record.sleepHoursPerNight;
    if (sleepHours && sleepHours < 6.5) {
      generatedInsights.push({
        id: 'sleep',
        icon: Bed,
        color: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-400' },
        title: 'Sleep Improvement Opportunity',
        text: `Your average of ${sleepHours} hours/night is below the recommended 7-9 hours. Prioritizing more rest could boost your energy and focus.`,
      });
    }

    // 2. Stress Insight
    const stressScore = record.stressScore;
    if (stressScore && stressScore >= 7) {
      generatedInsights.push({
        id: 'stress',
        icon: TrendingDown,
        color: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
        title: 'Elevated Stress Levels',
        text: `Your recent stress score of ${stressScore}/10 is high. Consider a 5-minute mindfulness exercise or a short walk to decompress.`,
      });
    }

    // 3. Activity Insight
    const steps = habit.stepsCount;
    if (steps !== undefined && steps < 5000) {
      generatedInsights.push({
        id: 'activity',
        icon: Footprints,
        color: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
        title: 'Increase Daily Movement',
        text: `You're averaging ${steps.toLocaleString()} steps. Adding a short 15-minute walk to your day can significantly improve your step count.`,
      });
    }

    if (generatedInsights.length === 0) {
      generatedInsights.push({
        id: 'positive',
        icon: TrendingUp,
        color: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
        title: 'Great Work!',
        text: 'Your recent health metrics are all within a healthy range. Keep up the consistent effort!',
      });
    }

    return generatedInsights.slice(0, 2); // Show max 2 insights
  }, [records, dailyHabits, mentalHealthLogs]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Lightbulb className="w-5 h-5 text-slate-400" /> Wellness Insights</h3>
      <div className="space-y-4">
        {insights.map(insight => <Insight key={insight.id} {...insight} />)}
      </div>
    </div>
  );
}