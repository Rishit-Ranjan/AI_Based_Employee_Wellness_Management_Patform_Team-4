import React, { useEffect, useState } from 'react';
import { CalendarCheck, Siren, Receipt, CheckCircle2, XCircle, Trash2, Search } from 'lucide-react';
import { fetchCheckups, updateCheckup, fetchSosAlerts, resolveSos, deleteSos, fetchExpenses, updateExpense, deleteExpense } from '../services/api';

export function AdminCheckupsModule() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState('');
    const load = () => fetchCheckups(true, { forceRefresh: true }).then(setAppointments).catch(console.error);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStatus = async (id, status) => { await updateCheckup(id, { status }); load(); };

  const query = search.trim().toLowerCase();
  const filteredAppointments = query
    ? appointments.filter((a) =>
        [a.employeeId, a.employeeName, a.checkupType, a.date, a.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      )
    : appointments;

  return (
    <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-base flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-(--color-text-muted)" /> All Check-up Appointments</h3>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-(--color-text-muted) absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, type, date, status…"
            className="w-full pl-9 pr-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) placeholder:text-(--color-text-muted)"
          />
        </div>
      </div>
      {filteredAppointments.length === 0 ? <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{appointments.length === 0 ? 'No appointments booked yet.' : `No appointments match "${search}".`}</p> : (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-(--color-text-muted) dark:text-(--color-text-muted-dark) border-b border-(--color-border) dark:border-(--color-border-dark)">
            <th className="pb-2 font-semibold">Employee</th><th className="pb-2 font-semibold">Type</th><th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filteredAppointments.map((a) => {
              const isPublicUser = !a.employeeId || a.employeeId === 'public_user' || a.employeeName === 'Public User';
              const empId = isPublicUser ? 'Unknown' : a.employeeId;
              const empName = a.employeeName && a.employeeName !== 'Public User' ? a.employeeName : '';
              return (
              <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 font-mono text-(--color-text-secondary) dark:text-(--color-text-muted-dark)">
                  {empId}{empName && <span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)"> ({empName})</span>}
                </td>
                <td className="py-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{a.checkupType}</td>
                <td className="py-2 text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{a.date}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) text-(--color-text-secondary) dark:text-(--color-text-secondary-dark) border border-(--color-border) dark:border-(--color-border-dark)">{a.status}</span></td>
                <td className="py-2">
                  <select value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)} className="px-2 py-1 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded text-[11px] text-(--color-text-primary) dark:text-(--color-text-primary-dark)">
                    {['Scheduled', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminSosMonitor() {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
    const load = () => fetchSosAlerts({ forceRefresh: true }).then(setAlerts).catch(console.error);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

            const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const handleDelete = async (id) => {
    try { await deleteSos(id); } catch (e) { console.error('Delete failed', e); }
    load();
  };

  const query = search.trim().toLowerCase();
  const filteredAlerts = query
    ? alerts.filter((a) =>
        [a.employeeId, a.employeeName, a.emergencyContactName, a.emergencyContactPhone, a.bloodGroup, a.allergies, a.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      )
    : alerts;


  return (
    <div className="space-y-6">
      {activeAlerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-2">⚠️ {activeAlerts.length} Active Emergency Alert(s)</div>
        </div>
      )}
      <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-base flex items-center gap-2"><Siren className="w-5 h-5 text-(--color-text-muted)" /> Emergency SOS Alerts</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-(--color-text-muted) absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, contact, status…"
              className="w-full pl-9 pr-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) placeholder:text-(--color-text-muted)"
            />
          </div>
        </div>
        {filteredAlerts.length === 0 ? <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{alerts.length === 0 ? 'No alerts triggered.' : `No alerts match "${search}".`}</p> : (
          <div className="space-y-2">
            {filteredAlerts.map((a) => (
              <div key={a.id} className={`border rounded-lg p-4 ${a.status === 'Active' ? 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40' : 'border-(--color-border) dark:border-(--color-border-dark)'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{a.employeeName} ({a.employeeId})</div>
                    <div className="text-[10px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}`}>{a.status}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] text-(--color-text-secondary) dark:text-(--color-text-secondary-dark)">
                  <div><span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Contact:</span> {a.emergencyContactName || '—'}</div>
                  <div><span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Phone:</span> {a.emergencyContactPhone || '—'}</div>
                  <div><span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Blood Group:</span> {a.bloodGroup || '—'}</div>
                  <div><span className="text-(--color-text-muted) dark:text-(--color-text-muted-dark)">Allergies:</span> {a.allergies || '—'}</div>
                </div>
                {a.status === 'Active' && (
                  <button onClick={() => resolveSos(a.id).then(load)} className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer">Mark Resolved</button>
                )}
                <div className="mt-3 flex justify-end">
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer" title="Delete alert"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminExpensesModule() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
    const load = () => fetchExpenses(true, { forceRefresh: true }).then(setExpenses).catch(console.error);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

    const handleStatus = async (id, status) => { await updateExpense(id, status); load(); };
  const handleDelete = async (id) => { await deleteExpense(id); load(); };

  const query = search.trim().toLowerCase();
  const filteredExpenses = query
    ? expenses.filter((e) =>
        [e.employeeId, e.description, e.category, e.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      )
    : expenses;

  return (
    <div className="bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-(--color-text-primary) dark:text-(--color-text-primary-dark) text-base flex items-center gap-2"><Receipt className="w-5 h-5 text-(--color-text-muted)" /> Health Expense Claims</h3>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-(--color-text-muted) absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, description, status…"
            className="w-full pl-9 pr-3 py-2 bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-lg text-xs text-(--color-text-primary) dark:text-(--color-text-primary-dark) placeholder:text-(--color-text-muted)"
          />
        </div>
      </div>
      {filteredExpenses.length === 0 ? <p className="text-xs text-(--color-text-muted) dark:text-(--color-text-muted-dark)">{expenses.length === 0 ? 'No expenses logged yet.' : `No expenses match "${search}".`}</p> : (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-(--color-text-muted) dark:text-(--color-text-muted-dark) border-b border-(--color-border) dark:border-(--color-border-dark)">
            <th className="pb-2 font-semibold">Employee</th><th className="pb-2 font-semibold">Description</th><th className="pb-2 font-semibold">Amount</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filteredExpenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 font-mono text-(--color-text-secondary) dark:text-(--color-text-muted-dark)">{e.employeeId}</td>
                <td className="py-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{e.description}</td>
                <td className="py-2 text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">₹{e.amount.toLocaleString('en-IN')}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : e.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>{e.status}</span></td>
                                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {e.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatus(e.id, 'Approved')} className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleStatus(e.id, 'Rejected')} className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 cursor-pointer"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 border border-(--color-border) dark:border-(--color-border-dark) rounded-md text-(--color-text-muted) dark:text-(--color-text-muted-dark) hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer" title="Delete claim"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
