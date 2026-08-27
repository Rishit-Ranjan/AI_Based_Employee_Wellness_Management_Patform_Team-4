import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Save, CheckCircle2, XCircle, Users, Trash2, AlertTriangle, X, Search } from 'lucide-react';
import { fetchAllInsurance, saveInsurance, updateInsuranceClaim, deleteInsurance } from '../services/api';

export default function AdminInsuranceModule({ allUsers = [] }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [form, setForm] = useState({ provider: '', policyNumber: '', coverage: '', expiryDate: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { employeeId, provider, policyNumber }
  const [deleteError, setDeleteError] = useState('');
  const [search, setSearch] = useState('');
  const [empQuery, setEmpQuery] = useState('');
  const [showEmpList, setShowEmpList] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAllInsurance().then(setPolicies).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { employeeId } = confirmDelete;
    setDeleting(employeeId);
    setDeleteError('');
    try {
      await deleteInsurance(employeeId);
      setPolicies((prev) => prev.filter((p) => p.employeeId !== employeeId));
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete the policy.');
    } finally {
      setDeleting(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setSaving(true);
    try {
      await saveInsurance({
        employeeId: selectedEmp,
        provider: form.provider,
        policyNumber: form.policyNumber,
        coverage: Number(form.coverage) || 0,
        expiryDate: form.expiryDate,
      });
      setForm({ provider: '', policyNumber: '', coverage: '', expiryDate: '' });
      setSelectedEmp('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleClaim = async (employeeId, claimId, status) => {
    await updateInsuranceClaim(employeeId, claimId, status);
    load();
  };

  const pendingClaims = policies.flatMap((p) => (p.claims || []).filter((c) => c.status === 'Pending').map((c) => ({ ...c, employeeId: p.employeeId })));

  const query = search.trim().toLowerCase();
  const filterMatch = (vals) => vals.filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
  const filteredPendingClaims = query ? pendingClaims.filter((c) => filterMatch([c.employeeId, c.description, c.status, c.amount])) : pendingClaims;
  const filteredPolicies = query ? policies.filter((p) => filterMatch([p.employeeId, p.provider, p.policyNumber, p.expiryDate, p.coverage])) : policies;

  // Search-as-you-type filtering for the Employee combobox in "Assign / Update Policy"
  const empQueryLower = empQuery.trim().toLowerCase();
  const empMatches = (u) => [u.name, u.employeeId].filter(Boolean).some((v) => String(v).toLowerCase().includes(empQueryLower));
  const filteredEmployees = empQuery ? allUsers.filter(empMatches) : allUsers;

  const selectEmployee = (u) => {
    setSelectedEmp(u.employeeId);
    setEmpQuery(`${u.name} (${u.employeeId})`);
    setShowEmpList(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-slate-400" /> Assign / Update Policy</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Employee</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={empQuery}
                onChange={(e) => { setEmpQuery(e.target.value); setShowEmpList(true); if (!e.target.value) setSelectedEmp(''); }}
                onFocus={() => setShowEmpList(true)}
                onBlur={() => setTimeout(() => setShowEmpList(false), 150)}
                placeholder="Search & select employee…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
            {showEmpList && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                {filteredEmployees.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No employees match "{empQuery}".</div>
                ) : (
                  filteredEmployees.map((u) => (
                    <button
                      type="button"
                      key={u.employeeId}
                      onMouseDown={() => selectEmployee(u)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                    >
                      <span className="font-semibold">{u.name}</span> <span className="text-slate-400 font-mono">({u.employeeId})</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Provider</label>
            <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Star Health" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Policy No.</label>
            <input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Coverage (₹)</label>
            <input type="number" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Expiry</label>
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <button type="submit" disabled={saving} className="sm:col-span-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Policy'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search insurance by employee, provider, policy no., coverage, expiry…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5 text-slate-400" /> Pending Claims ({filteredPendingClaims.length})</h3>
        {filteredPendingClaims.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">{query && pendingClaims.length > 0 ? `No pending claims match "${search}".` : 'No pending claims.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredPendingClaims.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.employeeId} — {c.description}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">₹{Number(c.amount).toLocaleString('en-IN')} · {new Date(c.date).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleClaim(c.employeeId, c.id, 'Approved')} className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleClaim(c.employeeId, c.id, 'Rejected')} className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 cursor-pointer"><XCircle className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-slate-400" /> All Policies</h3>
        {loading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p>
        ) : filteredPolicies.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">{query && policies.length > 0 ? `No policies match "${search}".` : 'No policies assigned yet.'}</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="pb-2 font-semibold">Employee</th>
                <th className="pb-2 font-semibold">Provider</th>
                <th className="pb-2 font-semibold">Coverage</th>
                <th className="pb-2 font-semibold">Used</th>
                <th className="pb-2 font-semibold">Expiry</th>
                <th className="pb-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 font-mono text-slate-600 dark:text-slate-400">{p.employeeId}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{p.provider}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">₹{Number(p.coverage || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">₹{Number(p.claimUsed || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2 text-slate-500 dark:text-slate-400">{p.expiryDate || '—'}</td>
                  <td className="py-2">
                    <button
                      onClick={() => {
                        setDeleteError('');
                        setConfirmDelete({ employeeId: p.employeeId, provider: p.provider, policyNumber: p.policyNumber });
                      }}
                      disabled={deleting === p.employeeId}
                      title="Delete policy"
                      className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm">Delete insurance policy?</h4>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              This will permanently remove the policy for{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{confirmDelete.employeeId}</span>
              {confirmDelete.provider && <span> ({confirmDelete.provider}{confirmDelete.policyNumber ? ` · ${confirmDelete.policyNumber}` : ''})</span>}.
              This action cannot be undone.
            </p>

            {deleteError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting === confirmDelete.employeeId}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting === confirmDelete.employeeId}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting === confirmDelete.employeeId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

