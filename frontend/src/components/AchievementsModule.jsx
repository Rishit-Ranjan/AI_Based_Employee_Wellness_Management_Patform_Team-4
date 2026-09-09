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

  if (loading) return <div className="text-sm text-(--color-text-muted) py-10 text-center">Loading achievements…</div>;

  return (
    <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-6">
      <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-base flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-(--color-text-muted)" /> My Achievements</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(achievements?.badges || []).map((b, i) => (
          <div key={i} className="border border-amber-100 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/40 rounded-lg p-3.5 text-center">
            <Award className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
            <div className="text-xs font-bold text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{b.name}</div>
            <div className="text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-0.5">{b.desc}</div>
          </div>
        ))}
        {(!achievements?.badges || achievements.badges.length === 0) && (
          <p className="col-span-full text-center text-sm text-(--color-text-muted) dark:text-(--color-text-muted-dark) py-4">No achievements earned yet. Keep tracking your goals!</p>
        )}
      </div>
    </div>
  );
}