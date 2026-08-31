import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Droplets, Footprints, Dumbbell, Moon, Smile, PartyPopper } from 'lucide-react';

const STORAGE_KEY = (employeeId, date) => `daily-wellness-checklist-${employeeId}-${date}`;

const todayKey = () => new Date().toISOString().split('T')[0];

// Friendly completion messages shown once every item is checked off.
const DONE_MESSAGES = [
  'You crushed today\'s checklist — great work! 🎉',
  'All checked off. Small habits, big wins. 💪',
];

export default function DailyWellnessChecklist({
  user,
  waterCups = 0,
  stepsCount = 0,
  exerciseHours = 0,
  sleepHours = 0,
}) {
  const employeeId = user?.employeeId || 'guest';
  const storageKey = useMemo(() => STORAGE_KEY(employeeId, todayKey()), [employeeId]);

  // Build the checklist items from the employee's real data. Items the employee
  // has already met for the day are pre-checked so the card reflects reality.
  const baseItems = useMemo(() => [
    {
      id: 'water',
      icon: Droplets,
      label: 'Drink 8 cups of water',
      caption: `Currently logged: ${waterCups} cups`,
      met: waterCups >= 8,
      color: 'text-sky-500',
      bg: 'bg-sky-100 dark:bg-sky-900/40',
    },
    {
      id: 'steps',
      icon: Footprints,
      label: 'Reach 7,500 steps',
      caption: `Currently logged: ${Number(stepsCount).toLocaleString()} steps`,
      met: stepsCount >= 7500,
      color: 'text-emerald-500',
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      id: 'exercise',
      icon: Dumbbell,
      label: 'Get 30 minutes of movement',
      caption: `Logged this week: ${exerciseHours} hrs`,
      met: exerciseHours >= 0.5,
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    {
      id: 'sleep',
      icon: Moon,
      label: 'Sleep 7+ hours',
      caption: `Average: ${sleepHours} hrs a night`,
      met: sleepHours >= 7,
      color: 'text-indigo-500',
      bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    },
    {
      id: 'mood',
      icon: Smile,
      label: 'Note how you\'re feeling today',
      caption: 'A quick mood check-in helps you stay aware',
      met: false,
      color: 'text-rose-500',
      bg: 'bg-rose-100 dark:bg-rose-900/40',
    },
  ], [waterCups, stepsCount, exerciseHours, sleepHours]);
// Persisted, user-toggled state (survives refresh). Initialised from real data met flags.
  const [checks, setChecks] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        /* fall through to defaults */
      }
    }
    return Object.fromEntries(baseItems.map((i) => [i.id, i.met]));
  });

  // If the underlying data improves during the day, respect the user's manual toggles
  // but never leave an already-met item unchecked.
  useEffect(() => {
    setChecks((prev) => {
      const next = { ...prev };
      let changed = false;
      baseItems.forEach((item) => {
        if (item.met && !next[item.id]) {
          next[item.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItems]);

  // Persist every change.
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checks));
  }, [checks, storageKey]);

  const toggle = (id) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }));

  const doneCount = baseItems.filter((i) => checks[i.id]).length;
  const total = baseItems.length;
  const pct = Math.round((doneCount / total) * 100);
  const isDone = doneCount === total;
  const message = DONE_MESSAGES[new Date().getDate() % DONE_MESSAGES.length];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <style>{`
        .checkbox-scroll::-webkit-scrollbar { width: 6px; }
        .checkbox-scroll::-webkit-scrollbar-track { background: transparent; }
        .checkbox-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .dark .checkbox-scroll::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Today's Wellness Checklist
        </h3>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pt-0.5">
          {doneCount}/{total} done
        </span>
      </div>
      <p className="flex h-[16px] items-center text-xs leading-none text-slate-500 dark:text-slate-400 mb-2">
        Tick off each habit. Your progress is saved for today.
      </p>

      <div className="checkbox-scroll max-h-[160px] overflow-y-auto pr-1 -mr-1 space-y-1">
        {baseItems.map((item) => {
          const Icon = item.icon;
          const checked = !!checks[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              title={item.caption}
              className={`h-[40px] w-full flex items-center gap-2 text-left px-2 rounded border transition-all cursor-pointer ${
                checked
                  ? 'bg-slate-50 dark:bg-slate-700/40 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <Icon className={`w-3 h-3 shrink-0 ${item.color}`} />
              <span className={`flex-1 min-w-0 truncate text-[11px] font-semibold leading-none ${checked ? 'text-slate-400 dark:text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                {item.label}
              </span>
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                checked
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 text-transparent'
              }`}>
                <CheckCircle2 className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="flex h-[16px] items-center justify-center text-[12px] leading-none text-center font-medium text-slate-500 dark:text-slate-400">
          {isDone ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <PartyPopper className="w-3.5 h-3.5" /> {message}
            </span>
          ) : (
            <>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span> of today's habits completed
            </>
          )}
        </p>
      </div>
    </div>
  );
}