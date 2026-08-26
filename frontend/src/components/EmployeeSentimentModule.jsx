import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Smile,
  ShieldAlert,
  Activity,
  TrendingUp,
  Check,
  Sparkles,
  MessageSquare,
  Zap,
  Calendar,
  Pencil,
  X,
  Save
} from 'lucide-react';
import { updateSentimentPulse, fetchEmployeeSentimentPulses } from '../services/api';

/**
 * EmployeeSentimentModule
 * -----------------------
 * Displays a single employee's own mental health & sentiment scenario.
 * It derives all data from the logged-in employee's health record (which the
 * App layer enriches with `feedbackLogs` from the sentiment_pulses collection).
 *
 * Only the logged-in employee's data is shown — nothing from other employees.
 */
export default function EmployeeSentimentModule({ user, record, records }) {
  const userRecord = record || (Array.isArray(records) ? records.find(r => r?.employeeId === user?.employeeId) : null);
  const [feedbackLogs, setFeedbackLogs] = React.useState((userRecord && userRecord.feedbackLogs) || []);
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [editStress, setEditStress] = React.useState(5);
  const [saving, setSaving] = React.useState(false);
  const totalLogs = feedbackLogs.length;

const stressScore = Number(userRecord?.stressScore) || 0;
  const rawStressLevel = userRecord?.stressLevel;
  // Numeric stress score takes precedence when it is a valid value (>= 1).
  // Only fall back to the string stressLevel when no score has been recorded.
  const stressLevel =
    stressScore >= 1
      ? stressScore >= 7
        ? 'High'
        : stressScore >= 4
        ? 'Medium'
        : 'Low'
      : rawStressLevel || 'Medium';
  const latestMood = userRecord?.latestMood || 'Neutral';
  const healthAssessment = userRecord?.healthAssessment || 'Good';
  const department = userRecord?.department || 'Engineering';

  const positiveCount = feedbackLogs.filter((log) => log.sentiment === 'Positive').length;
  const neutralCount = feedbackLogs.filter((log) => log.sentiment === 'Neutral').length;
  const negativeCount = feedbackLogs.filter((log) => log.sentiment === 'Negative').length;

  const positivePct = totalLogs > 0 ? Math.round((positiveCount / totalLogs) * 100) : 0;
  const neutralPct = totalLogs > 0 ? Math.round((neutralCount / totalLogs) * 100) : 0;
  const negativePct = totalLogs > 0 ? Math.round((negativeCount / totalLogs) * 100) : 0;

  const recentFeedback = feedbackLogs.slice(0, 5);

  const stressColor =
    stressLevel === 'High'
      ? 'text-rose-600'
      : stressLevel === 'Medium'
      ? 'text-amber-600'
      : 'text-emerald-600';

  const stressBadge =
    stressLevel === 'High'
      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      : stressLevel === 'Medium'
      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  const riskLabel =
    stressLevel === 'High'
      ? 'High Risk'
      : stressLevel === 'Medium'
      ? 'Moderate Risk'
      : 'Low Risk';

  const riskColor =
    riskLabel === 'High Risk'
      ? 'text-rose-600'
      : riskLabel === 'Moderate Risk'
      ? 'text-amber-600'
      : 'text-emerald-600';

  const refreshLogs = () => {
    fetchEmployeeSentimentPulses(user.employeeId, { forceRefresh: true })
      .then(pulses => setFeedbackLogs((pulses || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(console.error);
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditText(log.feedbackText || log.feedback || '');
    setEditStress(Number(log.stressScore) || 5);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditStress(5);
  };

  const saveEdit = async (logId) => {
    setSaving(true);
    try {
      await updateSentimentPulse(logId, { feedbackText: editText, stressScore: Number(editStress) });
      refreshLogs();
      cancelEdit();
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header / Intro */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-sm">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
              My Mental Health &amp; Sentiment Scenario
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized mental wellness insights derived from your pulse checks, stress levels, and feedback.
            </p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${stressBadge}`}>
          <Activity className="w-3.5 h-3.5" />
          {riskLabel}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Stress Index</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-display font-bold ${stressColor}`}>{stressScore}</span>
            <span className="text-xs text-slate-400 font-mono">/ 10</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${stressScore >= 7 ? 'bg-rose-500' : stressScore >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(5, stressScore * 10)}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Latest Mood</span>
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{latestMood}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">Self-reported state</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pulse Checks</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100">{totalLogs}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">Total feedback logs</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Assessment</span>
            <Check className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{healthAssessment}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">{department} dept</p>
        </div>
      </div>

      {/* Main Grid: Sentiment Distribution + Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Your Sentiment Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Positive / Neutral / Negative breakdown from pulse feedback</p>
            </div>
          </div>

          {totalLogs === 0 ? (
            <div className="py-8 text-center">
              <Smile className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No sentiment data yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Once you submit wellness pulse checks, your sentiment breakdown will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-emerald-500" /> Positive</span>
                  <span className="font-mono font-bold text-emerald-600">{positivePct}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positivePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-slate-400" /> Neutral</span>
                  <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{neutralPct}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${neutralPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-500" /> Negative</span>
                  <span className="font-mono font-bold text-rose-600">{negativePct}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${negativePct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Feedback Logs */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Feedback Logs</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your latest pulse check submissions</p>
            </div>
          </div>

          {recentFeedback.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No feedback submitted yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Your pulse check feedback will be listed here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentFeedback.map((log, idx) => (
                <li
                  key={log.id || idx}
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-start gap-3"
                >
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      log.sentiment === 'Positive'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : log.sentiment === 'Negative'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {log.sentiment || 'Neutral'}
                  </span>
                  <div className="flex-1 min-w-0">
                    {editingId === log.id ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          placeholder="Update your feedback…"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Stress</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editStress}
                              onChange={(e) => setEditStress(e.target.value)}
                              className="w-14 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-xs text-slate-800 dark:text-slate-200 text-center"
                            />
                            <span className="text-[10px] text-slate-400">/10</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => saveEdit(log.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {log.feedbackText || log.feedback || 'No text provided.'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Stress: {log.stressScore ?? '—'}/10 ·{' '}
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recently'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {editingId !== log.id && (
                    <button
                      onClick={() => startEdit(log)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit feedback"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Advisory / Insight */}
      <div
        className={`rounded-2xl p-5 flex items-start gap-3 border ${
          riskLabel === 'High Risk'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            : riskLabel === 'Moderate Risk'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
        }`}
      >
        <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${riskColor}`} />
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${riskColor}`}>
            Mental Wellness Insight
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            {riskLabel === 'High Risk'
              ? `Your stress index is elevated (${stressScore}/10). We strongly recommend taking a wellness break, using guided meditation, and scheduling a health check-up soon.`
              : riskLabel === 'Moderate Risk'
              ? `Your stress is at a moderate level (${stressScore}/10). Try incorporating breathing exercises and short breaks to maintain balance.`
              : `Your mental wellness is looking good! Keep up your healthy routines and continue submitting pulse checks to maintain visibility.`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
