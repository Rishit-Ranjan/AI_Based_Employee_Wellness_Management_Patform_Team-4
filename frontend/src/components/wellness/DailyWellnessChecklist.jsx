import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Droplets, Footprints, Dumbbell, Moon, Smile, PartyPopper, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = (employeeId, date) => `daily-wellness-checklist-${employeeId}-${date}`;
const CUSTOM_KEY = (employeeId, date) => `daily-wellness-custom-${employeeId}-${date}`;

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

  // ── Custom habits (user-added), persisted per day ──
  const customStorageKey = useMemo(() => CUSTOM_KEY(employeeId, todayKey()), [employeeId]);
  const [customItems, setCustomItems] = useState(() => {
    try {
      const saved = localStorage.getItem(customStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newHabit, setNewHabit] = useState('');

  useEffect(() => {
    localStorage.setItem(customStorageKey, JSON.stringify(customItems));
  }, [customItems, customStorageKey]);

  const addHabit = () => {
    const label = newHabit.trim();
    if (!label) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomItems(prev => [...prev, {
      id,
      icon: 'CheckCircle2',
      label,
      caption: 'Custom habit',
      met: false,
      color: 'text-teal-500',
      bg: 'bg-teal-100 dark:bg-teal-900/40',
      custom: true,
    }]);
    setChecks(prev => ({ ...prev, [id]: false }));
    setNewHabit('');
  };

  const deleteHabit = (id) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setChecks(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggle = (id) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }));

  const items = [...baseItems, ...customItems];
  const doneCount = items.filter((i) => checks[i.id]).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const isDone = doneCount === total;
  const message = DONE_MESSAGES[new Date().getDate() % DONE_MESSAGES.length];

  return (
    <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <style>{`
        .checkbox-scroll::-webkit-scrollbar { width: 6px; }
        .checkbox-scroll::-webkit-scrollbar-track { background: transparent; }
        .checkbox-scroll::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 9999px; }
        .dark .checkbox-scroll::-webkit-scrollbar-thumb { background: var(--color-border-strong-dark); }
      `}</style>
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-base flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Today's Wellness Checklist
        </h3>
        <span className="text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase tracking-wider pt-0.5">
          {doneCount}/{total} done
        </span>
      </div>
      <p className="flex h-[16px] items-center text-xs leading-none text-(--color-text-muted) dark:text-(--color-text-muted-dark) mb-2">
        Tick off each habit. Your progress is saved for today.
      </p>

      <div className="checkbox-scroll h-[220px] overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin">
        {items.map((item) => {
          const Icon = typeof item.icon === 'string' ? CheckCircle2 : item.icon;
          const checked = !!checks[item.id];
          return (
            <div key={item.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggle(item.id)}
                title={item.caption}
                className={`h-[40px] flex-1 min-w-0 flex items-center gap-2 text-left px-2 rounded border transition-all cursor-pointer ${
                  checked
                    ? 'bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border-emerald-200 dark:border-emerald-800'
                    : 'bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border-(--color-border) dark:border-(--color-border-dark) hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <Icon className={`w-3 h-3 shrink-0 ${item.color}`} />
                <span className={`flex-1 min-w-0 truncate text-[11px] font-semibold leading-none ${checked ? 'text-(--color-text-muted) dark:text-(--color-text-muted-dark) line-through' : 'text-(--color-text-secondary) dark:text-(--color-text-primary-dark)'}`}>
                  {item.label}
                </span>
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  checked
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-(--color-border-strong) dark:border-(--color-border-strong-dark) text-transparent'
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                </span>
              </button>
              {item.custom && (
                <button
                  type="button"
                  onClick={() => deleteHabit(item.id)}
                  title="Delete habit"
                  className="shrink-0 p-1.5 rounded border border-(--color-border) dark:border-(--color-border-dark) text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-rose-500 hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add custom habit */}
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHabit(); } }}
            placeholder="Add a custom habit..."
            maxLength={60}
            className="flex-1 min-w-0 px-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) outline-none transition-all"
          />
          <button
            type="button"
            onClick={addHabit}
            disabled={!newHabit.trim()}
            className="shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="flex h-[16px] items-center justify-center text-[12px] leading-none text-center font-medium text-(--color-text-muted) dark:text-(--color-text-muted-dark)">
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