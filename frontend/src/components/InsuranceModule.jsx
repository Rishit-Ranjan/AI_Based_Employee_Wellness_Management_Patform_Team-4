import React, { useEffect, useState } from 'react';
import { ShieldCheck, Phone, Hospital, Users, Calendar, Plus, AlertCircle, IndianRupee } from 'lucide-react';
import { fetchInsurance, fileInsuranceClaim } from '../services/api';

export default function InsuranceModule({ user }) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimDesc, setClaimDesc] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchInsurance(user.employeeId)
      .then(setPolicy)
      .catch((err) => setError(err?.status === 404 ? 'not_found' : (err?.message || 'Failed to load insurance details.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.employeeId]);

  const handleFileClaim = async (e) => {
    e.preventDefault();
    if (!claimDesc || !claimAmount) return;
    setSubmitting(true);
    try {
      await fileInsuranceClaim(user.employeeId, { description: claimDesc, amount: Number(claimAmount) });
      setClaimDesc(''); setClaimAmount(''); setShowClaimForm(false);
      load();
    } catch (err) {
      setError(err?.message || 'Could not file claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-400 py-10 text-center">Loading insurance details…</div>;

  if (error === 'not_found' || !policy) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center">
        <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-slate-700 dark:text-slate-200 mb-1">No insurance policy on file yet</h3>
        <p className="text-sm text-slate-400 dark:text-slate-400 max-w-md mx-auto">Your HR/Admin team hasn't linked a policy to your account. Once they do, your coverage, claims, and hospital network will appear here.</p>
      </div>
    );
  }

  const remaining = Math.max((policy.coverage || 0) - (policy.claimUsed || 0), 0);
  const usedPct = policy.coverage ? Math.min(100, ((policy.claimUsed || 0) / policy.coverage) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Provider</div>
          <div className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 mt-1">{policy.provider || '—'}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{policy.policyNumber}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Coverage</div>
          <div className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1"><IndianRupee className="w-4 h-4" />{Number(policy.coverage || 0).toLocaleString('en-IN')}</div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">Used ₹{Number(policy.claimUsed || 0).toLocaleString('en-IN')} · Remaining ₹{remaining.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Expiry</div>
          <div className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" />{policy.expiryDate || '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm mb-3"><Users className="w-4 h-4 text-slate-400" /> Family Members Covered</div>
          {(policy.familyMembers || []).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No family members added.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {policy.familyMembers.map((m, i) => <li key={i} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span>{m.name}</span><span className="text-slate-400 dark:text-slate-500">{m.relation}</span></li>)}
            </ul>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm mb-3"><Hospital className="w-4 h-4 text-slate-400" /> Network Hospitals</div>
          {(policy.hospitalList || []).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No hospitals listed yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
              {policy.hospitalList.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
        </div>
      </div>

      {(policy.emergencyNumbers || []).length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm mb-3"><Phone className="w-4 h-4 text-slate-400" /> Emergency Numbers</div>
          <div className="flex flex-wrap gap-2">
            {policy.emergencyNumbers.map((n, i) => <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300">{n}</span>)}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-slate-700 dark:text-slate-200 font-semibold text-sm">Claim History</div>
          <button onClick={() => setShowClaimForm(!showClaimForm)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> File a Claim
          </button>
        </div>

        {showClaimForm && (
          <form onSubmit={handleFileClaim} className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Description</label>
              <input value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)} placeholder="e.g. Dental treatment" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Amount (₹)</label>
              <input type="number" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            </div>
            <button type="submit" disabled={submitting} className="sm:col-span-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </form>
        )}

        {(policy.claims || []).length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No claims filed yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 font-semibold">Amount</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {policy.claims.slice().reverse().map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-500 dark:text-slate-400">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{c.description}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                      c.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    }`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && error !== 'not_found' && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
      )}
    </div>
  );
}
