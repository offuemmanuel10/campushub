'use client';

import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, deleteDoc, writeBatch, where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Bell, BellOff, Check, Trash2, Heart, MessageCircle, BadgeCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const NOTIF_ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  reply: MessageCircle,
  verification: BadgeCheck,
  admin: ShieldCheck,
  default: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  like: '#EF4444',
  comment: '#3730A3',
  reply: '#6366F1',
  verification: '#059669',
  admin: '#D97706',
  default: 'var(--color-primary)',
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const deleteNotif = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  const markAllRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications
      .filter(n => !n.read)
      .forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const clearAll = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
    await batch.commit();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Link href="/" className="size-10 rounded-full flex items-center justify-center hover:bg-[color:var(--color-muted)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Inbox</p>
              <h1 className="font-display text-3xl leading-none">Notifications.</h1>
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={clearAll}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            </div>
          )}
        </div>

        {unreadCount > 0 && (
          <p className="text-xs text-[color:var(--color-muted-foreground)] mt-3 ml-13 pl-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </header>

      <main className="px-5 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-4 flex items-center gap-3 animate-pulse">
                <div className="size-10 rounded-full bg-[color:var(--color-muted)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[color:var(--color-muted)] rounded w-3/4" />
                  <div className="h-3 bg-[color:var(--color-muted)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="size-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--color-muted)' }}>
              <BellOff className="w-7 h-7 text-[color:var(--color-muted-foreground)]" />
            </div>
            <p className="font-display text-xl mb-1">All quiet here</p>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              You have no notifications yet. When someone likes or comments on your post, it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const type = notif.type || 'default';
              const Icon = NOTIF_ICONS[type] || NOTIF_ICONS.default;
              const color = NOTIF_COLORS[type] || NOTIF_COLORS.default;
              const date = notif.createdAt?.toDate?.() || new Date();

              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={`card p-4 flex items-start gap-3 cursor-pointer transition-all ${
                    !notif.read ? 'border-l-4' : ''
                  }`}
                  style={!notif.read ? { borderLeftColor: color } : {}}>

                  {/* Icon */}
                  <div className="size-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {notif.title && (
                      <p className={`text-sm leading-snug mb-0.5 ${!notif.read ? 'font-semibold' : 'font-medium'} text-[color:var(--color-foreground)]`}>
                        {notif.title}
                      </p>
                    )}
                    {notif.body && (
                      <p className="text-sm text-[color:var(--color-muted-foreground)] line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
                        {timeAgo(date)}
                      </p>
                      {!notif.read && (
                        <span className="size-1.5 rounded-full" style={{ background: color }} />
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                    className="size-7 rounded-full flex items-center justify-center shrink-0 hover:bg-[color:var(--color-muted)] transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-[color:var(--color-muted-foreground)]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}