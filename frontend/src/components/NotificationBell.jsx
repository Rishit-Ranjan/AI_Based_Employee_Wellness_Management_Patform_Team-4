import React, { useEffect, useState } from 'react';
import { Bell, X, Check, Send, Trash2 } from 'lucide-react';
import { fetchNotifications, markNotificationRead, deleteNotification } from '../services/api';
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

  const handleDelete = async (n, e) => {
    e.stopPropagation();
    await deleteNotification(n.id);
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => (isAdmin ? onAdminClick() : setOpen(!open))}
        className="relative p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-(--color-bg-card-dark) dark:hover:bg-(--color-bg-subtle-dark) border border-white/70 dark:border-white/70 text-(--color-text-muted) dark:text-(--color-text-secondary-dark) rounded-lg cursor-pointer transition-all duration-200 shadow-sm"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && !isAdmin && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) border border-(--color-border) dark:border-(--color-border-dark) rounded-xl shadow-xl z-50">
          <div className="p-3 border-b border-(--color-border) dark:border-(--color-border-dark) flex items-center justify-between sticky top-0 bg-(--color-bg-card) dark:bg-(--color-bg-card-dark)">
            <span className="text-xs font-bold text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-slate-600 dark:text-(--color-text-muted-dark) dark:hover:text-(--color-text-primary-dark) cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-(--color-text-muted) p-4 text-center">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} onClick={() => handleRead(n)} className={`p-3 border-b border-slate-50 dark:border-(--color-border-dark)/60 cursor-pointer hover:bg-(--color-bg-subtle) dark:hover:bg-(--color-bg-subtle-dark)/40 ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-500/10' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-(--color-text-secondary) dark:text-(--color-text-primary-dark)">{n.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1" />}
                    {n.read && <Check className="w-3 h-3 text-emerald-400" />}
                    <button
                      onClick={(e) => handleDelete(n, e)}
                      className="p-0.5 text-slate-600 hover:text-rose-600 dark:text-(--color-text-secondary-dark) dark:hover:text-rose-400 cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) mt-1 leading-relaxed">{n.message}</p>
                <span className="text-[9px] text-(--color-text-muted) dark:text-(--color-text-muted-dark) font-mono mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
