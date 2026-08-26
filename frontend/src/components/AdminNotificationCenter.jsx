import React, { useEffect, useState } from 'react';
import { Bell, Send, Trash2 } from 'lucide-react';
import { fetchNotifications, sendNotification, deleteNotification } from '../services/api';

const CATEGORIES = ['General', 'Health Camp', 'Vaccination', 'Medical Checkup', 'Fitness Challenge', 'Insurance Renewal'];

export default function AdminNotificationCenter({ allUsers = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('General');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    fetchNotifications(true).then(setNotifications).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    setSending(true);
    try {
      await sendNotification({ title, message, category, targetEmployeeId: targetEmployeeId || null });
      setTitle(''); setMessage(''); setTargetEmployeeId('');
      load();
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Send className="w-5 h-5 text-slate-400" /> Compose Notification</h3>
        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Annual Health Camp)" className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Message…" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs resize-y text-slate-800 dark:text-slate-200" />
          <div className="flex items-center gap-3">
            <select value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200">
              <option value="">Broadcast to all employees</option>
              {allUsers.map((u) => <option key={u.employeeId} value={u.employeeId}>{u.name} ({u.employeeId})</option>)}
            </select>
            <button type="submit" disabled={sending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shrink-0">
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-slate-400" /> Sent Notifications</h3>
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No notifications sent yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.title} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono ml-1">{n.targetEmployeeId ? `→ ${n.targetEmployeeId}` : '→ all'}</span></div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <button onClick={() => handleDelete(n.id)} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
