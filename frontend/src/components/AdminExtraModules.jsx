import React, { useEffect, useState } from 'react';
import { CalendarCheck, Siren, Receipt, CheckCircle2, XCircle } from 'lucide-react';
import { fetchCheckups, updateCheckup, fetchSosAlerts, resolveSos, fetchExpenses, updateExpense } from '../services/api';

export function AdminCheckupsModule() {
  const [appointments, setAppointments] = useState([]);
  const load = () => fetchCheckups(true).then(setAppointments).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => { await updateCheckup(id, { status }); load(); };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><CalendarCheck className="w-5 h-5 text-slate-400" /> All Check-up Appointments</h3>
      {appointments.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500">No appointments booked yet.</p> : (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
            <th className="pb-2 font-semibold">Employee</th><th className="pb-2 font-semibold">Type</th><th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 font-mono text-slate-600 dark:text-slate-400">{a.employeeId} <span className="text-slate-400 dark:text-slate-500">({a.employeeName})</span></td>
                <td className="py-2 text-slate-700 dark:text-slate-200">{a.checkupType}</td>
                <td className="py-2 text-slate-500 dark:text-slate-400">{a.date}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{a.status}</span></td>
                <td className="py-2">
                  <select value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-800 dark:text-slate-200">
                    {['Scheduled', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminSosMonitor() {
  const [alerts, setAlerts] = useState([]);
  const load = () => fetchSosAlerts().then(setAlerts).catch(console.error);
  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === 'Active');

  return (
    <div className="space-y-6">
      {activeAlerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-2">⚠️ {activeAlerts.length} Active Emergency Alert(s)</div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Siren className="w-5 h-5 text-slate-400" /> Emergency SOS Alerts</h3>
        {alerts.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500">No alerts triggered.</p> : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className={`border rounded-lg p-4 ${a.status === 'Active' ? 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40' : 'border-slate-100 dark:border-slate-700'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.employeeName} ({a.employeeId})</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}`}>{a.status}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <div><span className="text-slate-400 dark:text-slate-500">Contact:</span> {a.emergencyContactName || '—'}</div>
                  <div><span className="text-slate-400 dark:text-slate-500">Phone:</span> {a.emergencyContactPhone || '—'}</div>
                  <div><span className="text-slate-400 dark:text-slate-500">Blood Group:</span> {a.bloodGroup || '—'}</div>
                  <div><span className="text-slate-400 dark:text-slate-500">Allergies:</span> {a.allergies || '—'}</div>
                </div>
                {a.status === 'Active' && (
                  <button onClick={() => resolveSos(a.id).then(load)} className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer">Mark Resolved</button>
                )}
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
  const load = () => fetchExpenses(true).then(setExpenses).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => { await updateExpense(id, status); load(); };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Receipt className="w-5 h-5 text-slate-400" /> Health Expense Claims</h3>
      {expenses.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500">No expenses logged yet.</p> : (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
            <th className="pb-2 font-semibold">Employee</th><th className="pb-2 font-semibold">Description</th><th className="pb-2 font-semibold">Amount</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 font-mono text-slate-600 dark:text-slate-400">{e.employeeId}</td>
                <td className="py-2 text-slate-700 dark:text-slate-200">{e.description}</td>
                <td className="py-2 text-slate-700 dark:text-slate-200">₹{e.amount.toLocaleString('en-IN')}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : e.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>{e.status}</span></td>
                <td className="py-2">
                  {e.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleStatus(e.id, 'Approved')} className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleStatus(e.id, 'Rejected')} className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 cursor-pointer"><XCircle className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
