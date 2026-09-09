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

  if (loading) return <div className="text-sm text-(--color-text-muted) py-10 text-center">Loading insurance details…</div>;

  if (error === 'not_found' || !policy) {
    return (
      <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-10 text-center">
        <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-(--color-text-secondary) dark:text-(--color-text-primary-dark) mb-1">No insurance policy on file yet</h3>
        <p className="text-sm text-(--color-text-muted) dark:text-(--color-text-muted-dark) max-w-md mx-auto">Your HR/Admin team hasn't linked a policy to your account. Once they do, your coverage, claims, and hospital network will appear here.</p>
      </div>
    );
  }

  const remaining = Math.max((policy.coverage || 0) - (policy.claimUsed || 0), 0);
  const usedPct = policy.coverage ? Math.min(100, ((policy.claimUsed || 0) / policy.coverage) * 100) : 0;

  return (
    <div className="space-y-6 lg:pr-20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Provider</div>
          <div className="text-lg font-display font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) mt-1">{policy.provider || '—'}</div>
          <div className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-1 font-mono">{policy.policyNumber}</div>
        </div>
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Coverage</div>
          <div className="text-lg font-display font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) mt-1 flex items-center gap-1"><IndianRupee className="w-4 h-4" />{Number(policy.coverage || 0).toLocaleString('en-IN')}</div>
          <div className="w-full bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-1.5">Used ₹{Number(policy.claimUsed || 0).toLocaleString('en-IN')} · Remaining ₹{remaining.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Expiry</div>
          <div className="text-lg font-display font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) mt-1 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-(--color-text-muted)" />{policy.expiryDate || '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="flex items-center gap-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark) font-semibold text-sm mb-3"><Users className="w-4 h-4 text-(--color-text-muted)" /> Family Members Covered</div>
          {(policy.familyMembers || []).length === 0 ? (
            <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">No family members added.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark)">
              {policy.familyMembers.map((m, i) => <li key={i} className="flex justify-between border-b border-(--color-border) dark:border-(--color-border-dark) pb-1.5"><span>{m.name}</span><span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{m.relation}</span></li>)}
            </ul>
          )}
        </div>
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="flex items-center gap-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark) font-semibold text-sm mb-3"><Hospital className="w-4 h-4 text-(--color-text-muted)" /> Network Hospitals</div>
          {(policy.hospitalList || []).length === 0 ? (
            <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">No hospitals listed yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) list-disc list-inside">
              {policy.hospitalList.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
        </div>
      </div>

      {(policy.emergencyNumbers || []).length > 0 && (
        <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
          <div className="flex items-center gap-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark) font-semibold text-sm mb-3"><Phone className="w-4 h-4 text-(--color-text-muted)" /> Emergency Numbers</div>
          <div className="flex flex-wrap gap-2">
            {policy.emergencyNumbers.map((n, i) => <span key={i} className="px-3 py-1.5 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs font-mono text-(--color-text-secondary) dark:text-(--color-text-secondary-dark)">{n}</span>)}
          </div>
        </div>
      )}

      <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-(--color-text-secondary) dark:text-(--color-text-primary-dark) font-semibold text-sm">Claim History</div>
          <button onClick={() => setShowClaimForm(!showClaimForm)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> File a Claim
          </button>
        </div>

        {showClaimForm && (
          <form onSubmit={handleFileClaim} className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-(--color-border) dark:border-(--color-border-dark) grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Description</label>
              <input value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)} placeholder="e.g. Dental treatment" className="w-full px-3 py-2 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-(--color-text-muted) dark:text-(--color-text-muted-dark) uppercase mb-1">Amount (₹)</label>
              <input type="number" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className="w-full px-3 py-2 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark)" />
            </div>
            <button type="submit" disabled={submitting} className="sm:col-span-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </form>
        )}

        {(policy.claims || []).length === 0 ? (
          <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">No claims filed yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-(--color-text-muted) dark:text-(--color-text-muted-dark) border-b border-(--color-border) dark:border-(--color-border-dark)">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 font-semibold">Amount</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {policy.claims.slice().reverse().map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="py-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{c.description}</td>
                  <td className="py-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">₹{Number(c.amount).toLocaleString('en-IN')}</td>
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
