import React, { useEffect, useState } from 'react';
import { Target, Award, Plus, Trash2, CheckCircle2, Pencil, X } from 'lucide-react';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../services/api';
import AchievementsModule from './AchievementsModule';

export default function GoalsModule({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('100');
  const [unit, setUnit] = useState('%');

  const load = () => {
    setLoading(true);
    fetchGoals(user.employeeId)
      .then(setGoals)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.employeeId]);

  const resetForm = () => {
    setTitle(''); setTargetValue('100'); setUnit('%'); setEditingId(null); setShowForm(false);
  };

  const toggleForm = () => {
    if (showForm) resetForm();
    else setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;
    if (editingId) {
      await updateGoal(editingId, { title, targetValue: Number(targetValue), unit });
    } else {
      await createGoal({ employeeId: user.employeeId, title, targetValue: Number(targetValue), unit });
    }
    resetForm();
    load();
  };

  const handleStartEdit = (goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTargetValue(String(goal.targetValue));
    setUnit(goal.unit || '%');
    setShowForm(true);
  };

  const handleProgress = async (goal, delta) => {
    const next = Math.max(0, Math.min(goal.targetValue, (goal.currentValue || 0) + delta));
    await updateGoal(goal.id, { currentValue: next });
    load();
  };

  const handleDelete = async (goalId) => {
    await deleteGoal(goalId);
    load();
  };

  if (loading) return <div className="text-sm text-slate-400 py-10 text-center">Loading goals…</div>;

  return (
    <div className="space-y-6 lg:pr-20">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2"><Target className="w-5 h-5 text-slate-400" /> My Goals</h3>
          <button onClick={toggleForm} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> New Goal
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Goal</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Walk 10,000 steps daily" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Target</label>
              <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, steps, hrs..." className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
                {editingId ? 'Save Changes' : 'Add Goal'}
              </button>
              <button type="button" onClick={resetForm} className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-bold">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </form>
        )}

        {goals.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No goals yet — set one to start tracking your progress.</p>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => {
              const pct = g.targetValue ? Math.min(100, ((g.currentValue || 0) / g.targetValue) * 100) : 0;
              return (
                <div key={g.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {g.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{g.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStartEdit(g)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:text-indigo-400 cursor-pointer" title="Edit goal"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer" title="Delete goal"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${g.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{g.currentValue || 0} / {g.targetValue} {g.unit} ({Math.round(pct)}%)</span>
                    {g.status !== 'Completed' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleProgress(g, -Math.max(1, g.targetValue * 0.1))} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">-10%</button>
                        <button onClick={() => handleProgress(g, Math.max(1, g.targetValue * 0.1))} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">+10%</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AchievementsModule user={user} />
    </div>
  );
}
