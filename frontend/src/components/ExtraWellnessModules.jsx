import React, { useEffect, useState } from 'react';
import { CalendarPlus, Siren, Receipt, Plus, Trash2, AlertTriangle, Check, Pencil, X } from 'lucide-react';
import { fetchCheckups, bookCheckup, deleteCheckup, updateCheckup, triggerSos, fetchSosAlerts, fetchExpenses, addExpense, deleteExpense, updateExpenseRecord } from '../services/api';

// --- Annual Health Check-up Scheduler ---
export function CheckupSchedulerModule() {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState('');
  const [checkupType, setCheckupType] = useState('Annual Health Check-up');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => { fetchCheckups().then(setAppointments).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setDate(''); setCheckupType('Annual Health Check-up'); setNotes(''); setEditingId(null); };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!date) return;
    if (editingId) {
      await updateCheckup(editingId, { date, checkupType, notes });
    } else {
      await bookCheckup({ date, checkupType, notes });
    }
    resetForm();
    load();
  };

  const handleStartEdit = (appt) => {
    setEditingId(appt.id);
    setDate(appt.date || '');
    setCheckupType(appt.checkupType || 'Annual Health Check-up');
    setNotes(appt.notes || '');
  };

  const handleCancel = async (id) => { await deleteCheckup(id); load(); };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><CalendarPlus className="w-5 h-5 text-slate-400" /> {editingId ? 'Edit Check-up' : 'Book a Check-up'}</h3>
        <form onSubmit={handleBook} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Type</label>
            <select value={checkupType} onChange={(e) => setCheckupType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200">
              <option>Annual Health Check-up</option>
              <option>Dental Checkup</option>
              <option>Eye Checkup</option>
              <option>Vaccination</option>
              <option>General Physician Visit</option>
              <option>Others</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div className="sm:col-span-4 flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" /> {editingId ? 'Save Changes' : 'Book Appointment'}</button>
          {editingId && (
            <button type="button" onClick={resetForm} className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-bold">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base mb-4">My Appointments</h3>
        {loading ? <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p> : appointments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No check-ups booked yet.</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.checkupType} — {a.date}</div>
                  {a.notes && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{a.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    a.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                    a.status === 'Cancelled' ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  }`}>{a.status}</span>
                  <button onClick={() => handleStartEdit(a)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:text-indigo-400 cursor-pointer" title="Edit check-up"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleCancel(a.id)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Emergency SOS ---
export function EmergencySOSModule({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => { fetchSosAlerts().then(setAlerts).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleTrigger = async () => {
    await triggerSos('Emergency SOS triggered from wellness portal');
    setSent(true);
    setConfirming(false);
    setTimeout(() => setSent(false), 4000);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center">
        <Siren className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-rose-800 text-lg mb-1">Emergency SOS</h3>
        <p className="text-xs text-rose-600 max-w-md mx-auto mb-5">Pressing this immediately alerts the admin/HR team with your emergency contact and known health info (blood group, allergies, conditions).</p>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-sm font-bold shadow-lg cursor-pointer">
            🚨 Trigger SOS Alert
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleTrigger} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer">Yes, Send Alert Now</button>
            <button onClick={() => setConfirming(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer">Cancel</button>
          </div>
        )}

        {sent && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
            <Check className="w-4 h-4" /> Alert sent — admin has been notified.
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base mb-4">My SOS History</h3>
        {loading ? <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p> : alerts.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No alerts triggered.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-200">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Health Expense Tracker ---
export function ExpenseTrackerModule() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Consultation');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => { fetchExpenses().then(setExpenses).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setDescription(''); setAmount(''); setCategory('Consultation'); setEditingId(null); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    if (editingId) {
      await updateExpenseRecord(editingId, { description, amount: Number(amount), category });
    } else {
      await addExpense({ description, amount: Number(amount), category });
    }
    resetForm();
    load();
  };

  const handleStartEdit = (exp) => {
    setEditingId(exp.id);
    setDescription(exp.description || '');
    setAmount(String(exp.amount || ''));
    setCategory(exp.category || 'Consultation');
  };

  const handleDelete = async (id) => { await deleteExpense(id); load(); };

  const totalPending = expenses.filter((e) => e.status === 'Pending').reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter((e) => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 lg:pr-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pending Reimbursement</div>
          <div className="text-lg font-display font-semibold text-amber-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Approved</div>
          <div className="text-lg font-display font-semibold text-emerald-600 mt-1">₹{totalApproved.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Receipt className="w-5 h-5 text-slate-400" /> {editingId ? 'Edit Expense' : 'Log an Expense'}</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dentist visit" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200">
              <option>Consultation</option><option>Medicines</option><option>Diagnostics</option><option>Hospitalization</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
          </div>
          <div className="sm:col-span-4 flex gap-2">
          <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" /> {editingId ? 'Save Changes' : 'Add Expense'}</button>
          {editingId && (
            <button type="button" onClick={resetForm} className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-bold">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base mb-4">Expense History</h3>
        {loading ? <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p> : expenses.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No expenses logged yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Description</th><th className="pb-2 font-semibold">Category</th><th className="pb-2 font-semibold">Amount</th><th className="pb-2 font-semibold">Status</th><th></th>
            </tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-500 dark:text-slate-400">{e.date}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{e.description}</td>
                  <td className="py-2 text-slate-500 dark:text-slate-400">{e.category}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : e.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>{e.status}</span></td>
                  <td className="py-2 text-right">{e.status === 'Pending' && <span className="inline-flex items-center gap-1">
                    <button onClick={() => handleStartEdit(e)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:text-indigo-400 cursor-pointer" title="Edit expense"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
