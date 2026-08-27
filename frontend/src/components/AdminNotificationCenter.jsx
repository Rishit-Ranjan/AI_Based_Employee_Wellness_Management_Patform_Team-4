import React, { useEffect, useState } from 'react';
import { Bell, Send, Trash2, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { fetchNotifications, sendNotification, deleteNotification, markNotificationRead } from '../services/api';

const CATEGORIES = ['General', 'Health Camp', 'Vaccination', 'Medical Checkup', 'Fitness Challenge', 'Insurance Renewal'];

// System-generated categories that map to an admin dashboard section
const NAVIGABLE_CATEGORIES = ['Medical Checkup', 'SOS', 'Expense Claim'];

export default function AdminNotificationCenter({ allUsers = [], onNavigate, onChange }) {
  const [notifications, setNotifications] = useState([]);
  const [receivedNotifications, setReceivedNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('General');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');

  // Notify the parent whenever this center's data changes so the bell badge can
  // refresh in real time as notifications are read/deleted.
  const notify = () => { if (onChange) onChange(); };

  const load = () => {
    fetchNotifications(true).then((data) => {
      setNotifications(data);
      notify();
    }).catch(console.error);
    loadReceivedNotifications();
  };

  const loadReceivedNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?all=1', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Only system-generated notifications (e.g. employee-triggered SOS alerts,
        // check-up bookings, and expense claims) count as "received". Notifications
        // composed by an admin are NOT employee submissions, so they are excluded.
        const systemNotifications = data.filter(n => n.createdBy === 'System');
        setReceivedNotifications(systemNotifications);
        notify();
      }
    } catch (err) {
      console.error('Failed to load received notifications:', err);
    }
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

  // Sent tab should only show notifications the admin actually sent/composed.
  // System-generated notifications (employee SOS / check-up / expense claims)
  // are handled separately under the "Received" tab and must not appear here.
  const sentNotifications = notifications.filter(n => n.createdBy !== 'System');

  // Clicking a system notification marks it as read (clearing the bell badge)
  // and optionally navigates to the related admin section.
  const handleNotificationClick = async (n) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        load();
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    if (onNavigate && NAVIGABLE_CATEGORIES.includes(n.category)) {
      onNavigate(n.category);
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Medical Checkup':
        return <Calendar className="w-4 h-4" />;
      case 'SOS':
        return <AlertCircle className="w-4 h-4" />;
      case 'Expense Claim':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Medical Checkup':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      case 'SOS':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'Expense Claim':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-slate-50 dark:bg-slate-700';
    }
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          <TabButton id="compose" label="Compose" icon={Send} />
          <TabButton id="sent" label="Sent Notifications" icon={Bell} />
          <TabButton id="received" label="Received Notifications" icon={AlertCircle} />
        </div>

        {activeTab === 'compose' && (
          <div>
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
        )}

        {activeTab === 'sent' && (
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-slate-400" /> Sent Notifications</h3>
            {sentNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No notifications sent yet.</p>
            ) : (
              <div className="space-y-2">
                {sentNotifications.map((n) => {
                  const canNavigate = NAVIGABLE_CATEGORIES.includes(n.category);
                  return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start justify-between border rounded-lg p-3 transition-colors ${
                      canNavigate
                        ? 'border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800'
                        : 'border-slate-100 dark:border-slate-700'
                    } ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        {!n.read && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />}
                        <span className="truncate">{n.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono ml-1 shrink-0">{n.targetEmployeeId ? `→ ${n.targetEmployeeId}` : '→ all'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-300 dark:text-slate-600 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                        {canNavigate && (
                          <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                            Click to view →
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-slate-400" /> Received Notifications</h3>
            {receivedNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No notifications from employees yet.</p>
            ) : (
              <div className="space-y-2">
                {receivedNotifications.map((n) => {
                  const canNavigate = NAVIGABLE_CATEGORIES.includes(n.category);
                  return (
                  <div
                    key={n.id}
                    onClick={() => canNavigate && handleNotificationClick(n)}
                    className={`flex items-start justify-between border rounded-lg p-3 transition-colors ${getCategoryColor(n.category)} ${canNavigate ? 'cursor-pointer hover:opacity-80' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{getCategoryIcon(n.category)}</span>
                        <span className="truncate">{n.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono ml-1 shrink-0">({n.targetEmployeeId || 'System'})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                        {NAVIGABLE_CATEGORIES.includes(n.category) && (
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {n.category}
                          </span>
                        )}
                        {canNavigate && (
                          <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                            Click to view →
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id).then(() => loadReceivedNotifications()); }} className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:text-rose-400 cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
