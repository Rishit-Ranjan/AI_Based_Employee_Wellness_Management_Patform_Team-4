import React, { useEffect, useState } from 'react';
import { FileDown, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchHealthHistory, downloadHealthReportPdf } from '../services/api';

function trendIcon(curr, prev) {
  if (prev === undefined || prev === null || curr === prev) return <Minus className="w-3 h-3 text-slate-300" />;
  return curr > prev ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />;
}

export default function ReportsModule({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHealthHistory(user.employeeId)
      .then(setHistory)
      .catch((err) => setError(err?.message || 'Failed to load report history.'))
      .finally(() => setLoading(false));
  }, [user.employeeId]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadHealthReportPdf(user.employeeId);
    } catch (err) {
      setError(err?.message || 'Could not download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2"><FileDown className="w-5 h-5 text-slate-400" /> Download Health Report</h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Generates a PDF snapshot of your current wellness score, BMI, stress, sleep, and recommendations.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <FileDown className="w-4 h-4" /> {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-1"><History className="w-5 h-5 text-slate-400" /> Old Reports Timeline</h3>
        <p className="text-xs text-slate-400 dark:text-slate-400 mb-4">Every time your health profile is updated, a snapshot is saved here so you can track changes over time.</p>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No history yet — update your health profile to start building a timeline.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">BMI</th>
                  <th className="pb-2 font-semibold">Blood Pressure</th>
                  <th className="pb-2 font-semibold">Stress</th>
                  <th className="pb-2 font-semibold">Sleep (hrs)</th>
                  <th className="pb-2 font-semibold">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const prev = history[i + 1];
                  return (
                    <tr key={h.id} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">{new Date(h.snapshotAt).toLocaleString()}</td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200 flex items-center gap-1">{h.bmi ?? '—'} {prev && trendIcon(h.bmi, prev.bmi)}</td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200">{h.bloodPressure ?? '—'}</td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200">{h.stressLevel ?? '—'}</td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200 flex items-center gap-1">{h.sleepHoursPerNight ?? '—'} {prev && trendIcon(h.sleepHoursPerNight, prev.sleepHoursPerNight)}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{h.healthAssessment ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </div>
    </div>
  );
}
