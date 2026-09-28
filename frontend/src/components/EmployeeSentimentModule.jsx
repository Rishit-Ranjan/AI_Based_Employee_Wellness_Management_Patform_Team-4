import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Smile,
  Meh,
  ShieldAlert,
  Activity,
  TrendingUp,
  Check,
  BrainCircuit,
  MessageSquare,
  Zap,
  Calendar,
  Pencil,
  Trash2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { updateSentimentPulse, fetchEmployeeSentimentPulses, deleteSentimentPulse, fetchSentimentDeletionPolicy } from '../services/api';

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
  const [deletingId, setDeletingId] = React.useState(null);
  const [showAllLogs, setShowAllLogs] = React.useState(false);
  // Delete-confirmation dialog (replaces the old window.confirm prompt).
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [deleteReason, setDeleteReason] = React.useState('Prefer not to say');
  const [deleteAcknowledged, setDeleteAcknowledged] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  const [deletePolicy, setDeletePolicy] = React.useState(null);
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

  // Only the newest few logs are rendered by default, but the employee's whole
  // history is already loaded (the API returns every pulse for this employee),
  // so older entries stay reachable through `showAllLogs`.
  const RECENT_LOG_LIMIT = 5;
  const visibleFeedback = showAllLogs ? feedbackLogs : feedbackLogs.slice(0, RECENT_LOG_LIMIT);
  const hasOlderLogs = feedbackLogs.length > RECENT_LOG_LIMIT;

  // Fair-use allowance shown in the delete dialog. The server is authoritative;
  // these defaults only cover the window before the first policy response lands.
  const deleteLimit = deletePolicy?.limitPerDay ?? 3;
  const deleteRemaining =
    typeof deletePolicy?.remainingToday === 'number' ? deletePolicy.remainingToday : deleteLimit;
  const deleteLimitReached = deletePolicy?.limitPerDay != null && deleteRemaining <= 0;

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

  const employeeId = user?.employeeId;

  // Memoised so the polling effect below can depend on it without re-subscribing
  // on every render (same shape as `loadVitals` in UserDashboard).
  const refreshLogs = React.useCallback(() => {
    if (!employeeId) return;
    fetchEmployeeSentimentPulses(employeeId, { forceRefresh: true })
      .then(pulses => setFeedbackLogs((pulses || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(console.error);
  }, [employeeId]);

  // Live-update this section: load on mount, then poll and refresh whenever the
  // tab regains focus (the same real-time pattern as NotificationBell and the
  // vitals gauge).
  //
  // This is also what makes the two cards fill in reliably: the App layer attaches
  // `feedbackLogs` to the health record only *after* its own async fetch resolves,
  // while the `useState` above is a one-time seed. So when this module mounted
  // before that payload arrived (reloading straight onto this tab, which is
  // restored from localStorage), the cards were left showing their empty
  // placeholders until another reload happened to win that race.
  // Keeps the fair-use counter shown inside the delete dialog in sync with the
  // server (which enforces it), including after a refused deletion.
  const loadDeletePolicy = React.useCallback(() => {
    fetchSentimentDeletionPolicy({ forceRefresh: true })
      .then((policy) => { if (policy) setDeletePolicy(policy); })
      .catch(() => { /* non-fatal: the dialog falls back to the default quota */ });
  }, []);

  React.useEffect(() => {
    refreshLogs();
    loadDeletePolicy();
    const interval = setInterval(() => {
      refreshLogs();
      loadDeletePolicy();
    }, 15000);
    const onFocus = () => {
      refreshLogs();
      loadDeletePolicy();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshLogs, loadDeletePolicy]);

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

  const openDeleteDialog = (log) => {
    if (!log?.id) return;
    setPendingDelete(log);
    setDeleteReason('Prefer not to say');
    setDeleteAcknowledged(false);
    setDeleteError('');
    // Re-read the allowance so the quota shown is the authoritative one.
    loadDeletePolicy();
  };

  const closeDeleteDialog = () => {
    if (deletingId) return; // never dismiss a request that is in flight
    setPendingDelete(null);
    setDeleteAcknowledged(false);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    const logId = pendingDelete?.id;
    // The dialog gates this behind an explicit acknowledgement, and the server
    // additionally enforces the fair-use quota + cooldown.
    if (!logId || !deleteAcknowledged) return;
    setDeletingId(logId);
    setDeleteError('');
    try {
      const result = await deleteSentimentPulse(logId, deleteReason);
      // Drop it from the list immediately, then re-sync with the server.
      setFeedbackLogs((prev) => prev.filter((log) => log.id !== logId));
      if (editingId === logId) cancelEdit();
      if (result && typeof result.remainingToday === 'number') setDeletePolicy(result);
      setPendingDelete(null);
      setDeleteAcknowledged(false);
      refreshLogs();
    } catch (err) {
      // 429 (quota / cooldown), 403 and 404 all arrive as server-authored text.
      setDeleteError(err?.message || 'Could not delete this feedback log. Please try again.');
      loadDeletePolicy();
      console.error('Failed to delete feedback:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 lg:pr-20"
    >
      {/* Header / Intro */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-sm">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-lg">
              My Mental Health &amp; Sentiment Scenario
            </h2>
            <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-0.5">
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
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wider">Stress Index</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-display font-bold ${stressColor}`}>{stressScore}</span>
            <span className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) font-mono">/ 10</span>
          </div>
          <div className="w-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${stressScore >= 7 ? 'bg-rose-500' : stressScore >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(5, stressScore * 10)}%` }}
            />
          </div>
        </div>

        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wider">Latest Mood</span>
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-display font-bold text-(--color-text-primary) dark:text-(--color-text-primary-dark)">{latestMood}</div>
          <p className="text-[10px] text-(--color-text-muted) mt-2 font-mono">Self-reported state</p>
        </div>

        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wider">Pulse Checks</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-display font-bold text-(--color-text-primary) dark:text-(--color-text-primary-dark)">{totalLogs}</div>
          <p className="text-[10px] text-(--color-text-muted) mt-2 font-mono">Total feedback logs</p>
        </div>

        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-(--color-text-muted) uppercase tracking-wider">Assessment</span>
            <Check className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-display font-bold text-(--color-text-primary) dark:text-(--color-text-primary-dark)">{healthAssessment}</div>
          <p className="text-[10px] text-(--color-text-muted) mt-2 font-mono">{department} dept</p>
        </div>
      </div>

      {/* Main Grid: Sentiment Distribution + Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Sentiment Distribution */}
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-(--color-border) dark:border-(--color-border-dark) pb-4">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-sm">
                Your Sentiment Distribution
              </h3>
              <p className="text-xs text-(--color-text-muted) mt-0.5">Positive / Neutral / Negative breakdown from pulse feedback</p>
            </div>
          </div>

          {totalLogs === 0 ? (
            <div className="py-8 text-center">
              <Smile className="w-8 h-8 text-slate-300 dark:text-(--color-border-strong-dark) mx-auto mb-3" />
              <p className="text-sm font-semibold text-(--color-text-muted) dark:text-(--color-text-muted-dark)">No sentiment data yet</p>
              <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-1">
                Once you submit wellness pulse checks, your sentiment breakdown will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mb-1.5">
                  <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-emerald-500" /> Positive</span>
                  <span className="font-mono font-bold text-emerald-600">{positivePct}%</span>
                </div>
                <div className="w-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positivePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mb-1.5">
                  <span className="flex items-center gap-1.5"><Meh className="w-4 h-4 text-(--color-text-muted)" /> Neutral</span>
                  <span className="font-mono font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{neutralPct}%</span>
                </div>
                <div className="w-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${neutralPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mb-1.5">
                  <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-500" /> Negative</span>
                  <span className="font-mono font-bold text-rose-600">{negativePct}%</span>
                </div>
                <div className="w-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${negativePct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Feedback Logs */}
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-(--color-border) dark:border-(--color-border-dark) pb-4">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-sm">Recent Feedback Logs</h3>
              <p className="text-xs text-(--color-text-muted) mt-0.5">Your latest pulse check submissions</p>
            </div>
          </div>

          {feedbackLogs.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-(--color-border-strong-dark) mx-auto mb-3" />
              <p className="text-sm font-semibold text-(--color-text-muted) dark:text-(--color-text-muted-dark)">No feedback submitted yet</p>
              <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-1">
                Your pulse check feedback will be listed here.
              </p>
            </div>
          ) : (
            <ul className={`space-y-3 overflow-y-auto pr-1.5 -mr-1.5 ${showAllLogs ? 'max-h-[32rem]' : 'max-h-96'}`}>
              {visibleFeedback.map((log, idx) => (
                <li
                  key={log.id || idx}
                  className="bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-3.5 flex items-start gap-3"
                >
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      log.sentiment === 'Positive'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : log.sentiment === 'Negative'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) text-(--color-text-muted) dark:text-(--color-text-secondary-dark) border-(--color-border) dark:border-(--color-border-dark)'
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
                          className="w-full px-3 py-2 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-(--color-text-muted) uppercase">Stress</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editStress}
                              onChange={(e) => setEditStress(e.target.value)}
                              className="w-14 px-2 py-1 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-center"
                            />
                            <span className="text-[10px] text-(--color-text-muted)">/10</span>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) hover:bg-slate-200 dark:hover:bg-(--color-bg-subtle-dark) text-(--color-text-muted) dark:text-(--color-text-secondary-dark) rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) leading-relaxed">
                          {log.feedbackText || log.feedback || 'No text provided.'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) font-mono">
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
                    <div className="shrink-0 flex flex-col gap-1.5">
                      <button
                        onClick={() => startEdit(log)}
                        className="p-1.5 border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-indigo-500 hover:border-indigo-300 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit feedback"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(log)}
                        disabled={deletingId === log.id}
                        className="p-1.5 border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {hasOlderLogs && (
            <button
              onClick={() => setShowAllLogs(prev => !prev)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-[11px] font-semibold text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-indigo-500 hover:border-indigo-300 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
              title={showAllLogs ? 'Collapse back to the most recent logs' : 'Load the full feedback history'}
            >
              {showAllLogs ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show latest {RECENT_LOG_LIMIT} only
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show all {feedbackLogs.length} logs
                </>
              )}
            </button>
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
        <BrainCircuit className={`w-5 h-5 shrink-0 mt-0.5 ${riskColor}`} />
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${riskColor}`}>
            Mental Wellness Insight
          </h4>
          <p className="text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) mt-1 leading-relaxed">
            {riskLabel === 'High Risk'
              ? `Your stress index is elevated (${stressScore}/10). We strongly recommend taking a wellness break, using guided meditation, and scheduling a health check-up soon.`
              : riskLabel === 'Moderate Risk'
              ? `Your stress is at a moderate level (${stressScore}/10). Try incorporating breathing exercises and short breaks to maintain balance.`
              : `Your mental wellness is looking good! Keep up your healthy routines and continue submitting pulse checks to maintain visibility.`}
          </p>
        </div>
      </div>

      {/* Delete confirmation dialog. Portalled to <body> because a `fixed`
          overlay nested under the animated wrapper can be positioned against
          that wrapper rather than the viewport. */}
      {pendingDelete && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 p-4"
          onClick={closeDeleteDialog}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-sm">
                    Delete this feedback log?
                  </h4>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-0.5">
                    Permanent · cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={closeDeleteDialog}
                disabled={deletingId === pendingDelete.id}
                className="p-1 text-(--color-text-muted) hover:text-(--color-text-secondary) dark:hover:text-(--color-text-primary-dark) cursor-pointer disabled:opacity-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exactly what is about to be removed */}
            <div className="rounded-xl border border-(--color-border) dark:border-(--color-border-dark) bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) p-3 mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    pendingDelete.sentiment === 'Positive'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : pendingDelete.sentiment === 'Negative'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) text-(--color-text-muted) dark:text-(--color-text-secondary-dark) border-(--color-border) dark:border-(--color-border-dark)'
                  }`}
                >
                  {pendingDelete.sentiment || 'Neutral'}
                </span>
                <span className="text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) font-mono">
                  Stress {pendingDelete.stressScore ?? '—'}/10 ·{' '}
                  {pendingDelete.createdAt ? new Date(pendingDelete.createdAt).toLocaleString() : 'Recently'}
                </span>
              </div>
              <p className="text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) leading-relaxed line-clamp-3">
                {pendingDelete.feedbackText || pendingDelete.feedback || 'No text provided.'}
              </p>
            </div>

            <p className="text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) leading-relaxed mb-3">
              Your feedback logs drive your sentiment distribution and the anonymised department wellness
              analytics. Removing an entry is permanent — it cannot be restored, and it cannot be
              re-submitted with its original timestamp.
            </p>

            {/* Fair-use protection (enforced by the server, surfaced here) */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 mb-4">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Fair-use protection is active
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                {deleteLimitReached
                  ? `You have used all ${deleteLimit} deletions allowed in a 24 hour window. Please try again later.`
                  : `You can delete up to ${deleteLimit} feedback logs per 24 hours — ${deleteRemaining} remaining. Every deletion is logged for audit.`}
                {deletePolicy?.nextAllowedAt
                  ? ` Next deletion allowed after ${new Date(deletePolicy.nextAllowedAt).toLocaleTimeString()}.`
                  : ''}
              </p>
            </div>

            <label className="block text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) dark:text-(--color-text-muted-dark) mb-1.5">
              Reason (optional)
            </label>
            <select
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              disabled={deletingId === pendingDelete.id}
              className="w-full mb-4 px-3 py-2 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer disabled:opacity-60"
            >
              <option>Submitted by mistake</option>
              <option>Duplicate entry</option>
              <option>Contains information I want removed</option>
              <option>Prefer not to say</option>
            </select>

            <label className="flex items-start gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                disabled={deletingId === pendingDelete.id}
                className="mt-0.5 w-3.5 h-3.5 accent-rose-600 cursor-pointer"
              />
              <span className="text-[11px] text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) leading-relaxed">
                I understand this entry will be permanently removed from my sentiment history, and that the
                deletion is recorded for audit.
              </span>
            </label>

            {deleteError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeDeleteDialog}
                disabled={deletingId === pendingDelete.id}
                className="px-3 py-2 border border-(--color-border) dark:border-(--color-border-dark) text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) rounded-lg text-xs font-bold hover:bg-(--color-bg-subtle) dark:hover:bg-(--color-bg-subtle-dark) cursor-pointer disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!deleteAcknowledged || deleteLimitReached || deletingId === pendingDelete.id}
                title={!deleteAcknowledged ? 'Tick the acknowledgement to continue' : 'Delete this feedback log'}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingId === pendingDelete.id ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
