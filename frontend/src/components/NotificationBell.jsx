import React, { useEffect, useState } from 'react';
import { Bell, X, Check, Send } from 'lucide-react';
import { fetchNotifications, markNotificationRead } from '../services/api';
import AdminNotificationCenter from './AdminNotificationCenter';

export default function NotificationBell({ isAdmin = false, onAdminClick, refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const load = () => {
    // forceRefresh bypasses the in-memory GET cache so the badge stays real-time
    fetchNotifications(isAdmin, { forceRefresh: true }).then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    // Also refresh whenever the tab regains focus so the badge stays current.
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin]);

  // Reload instantly when the parent signals a change (e.g. notifications marked read elsewhere)
  useEffect(() => {
    if (refreshKey > 0) load();
  }, [refreshKey]);

  // For admins the badge should reflect incoming system alerts (SOS / check-ups /
  // expense claims) that still need handling. Admin-composed notifications are sent
  // by the admin and have no readBy marker, so they would otherwise always count as
  // unread and keep the badge stuck on a non-zero number. Employee-side notifications
  // are all relevant, so they're counted normally.
  const unreadCount = notifications.filter((n) =>
    !n.read && (isAdmin ? n.createdBy === 'System' : true)
  ).length;

  const handleRead = async (n) => {
    if (n.read) return;
    await markNotificationRead(n.id);
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => (isAdmin ? onAdminClick() : setOpen(!open))}
        className="relative p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded-lg cursor-pointer transition-all duration-200 shadow-sm"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && !isAdmin && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} onClick={() => handleRead(n)} className={`p-3 border-b border-slate-50 dark:border-slate-700/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-500/10' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0" />}
                  {n.read && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                <span className="text-[9px] text-slate-300 dark:text-slate-500 font-mono mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
