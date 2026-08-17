import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { fetchAchievements } from '../services/api';

export default function AchievementsModule({ user }) {
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAchievements = async () => {
      setLoading(true);
      try {
        const data = await fetchAchievements(user.employeeId);
        setAchievements(data);
      } catch (err) {
        console.error("Failed to load achievements:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAchievements();
  }, [user.employeeId]);

  if (loading) return <div className="text-sm text-slate-400 py-10 text-center">Loading achievements…</div>;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-slate-400" /> My Achievements</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(achievements?.badges || []).map((b, i) => (
          <div key={i} className="border border-amber-100 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/40 rounded-lg p-3.5 text-center">
            <Award className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{b.name}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{b.desc}</div>
          </div>
        ))}
        {(!achievements?.badges || achievements.badges.length === 0) && (
          <p className="col-span-full text-center text-sm text-slate-400 dark:text-slate-500 py-4">No achievements earned yet. Keep tracking your goals!</p>
        )}
      </div>
    </div>
  );
}