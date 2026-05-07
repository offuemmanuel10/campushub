'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import Image from 'next/image';
import {
  Users, FileText, BadgeCheck, Trash2, Check, X,
  ShieldCheck, User as UserIcon, RefreshCw
} from 'lucide-react';

export default function AdminPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'users'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
   if (profile && (profile.role as string) !== 'admin') router.push('/');
  }, [profile]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUsers(); unsubProducts(); };
  }, []);

  const pendingVerifications = users.filter(u => u.verificationStatus === 'pending');
  const verifiedUsers = users.filter(u => u.isVerified);

  const handleApprove = async (userId: string, userEmail: string, userName: string) => {
    setActionLoading(userId + '_approve');
    try {
      const verifiedAt = new Date();
      const expiresAt = new Date(verifiedAt);
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      await updateDoc(doc(db, 'users', userId), {
        isVerified: true,
        verificationStatus: 'approved',
        verifiedAt: serverTimestamp(),
        verificationExpiresAt: expiresAt,
      });

      // Send email via mail collection (requires Firebase Trigger Email extension)
      await doc(collection(db, 'mail'));
      const mailRef = doc(collection(db, 'mail'));
      await updateDoc(mailRef, {
        to: userEmail,
        message: {
          subject: '🎉 You\'re now verified on Campus Hub!',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #1B2B5E;">Congratulations, ${userName}! 🎉</h2>
              <p>Your Campus Hub account has been <strong>verified</strong>. Here's what you now have access to:</p>
              <ul>
                <li>✅ Verified badge on your profile and posts</li>
                <li>✅ Your shop is now visible to all users</li>
                <li>✅ Shareable shop link to share with customers</li>
                <li>✅ Unlimited posts per day</li>
              </ul>
              <p style="color: #666;">Note: Your verification is valid for <strong>30 days</strong>. You'll need to renew it after that.</p>
              <a href="https://campushub.app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1B2B5E;color:white;border-radius:12px;text-decoration:none;font-weight:600;">
                Open Campus Hub
              </a>
            </div>
          `,
        },
      }).catch(() => {
        // If mail collection doesn't exist yet, just log
        console.log('Mail extension not set up yet - approval saved without email');
      });

    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId + '_reject');
    try {
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: 'rejected',
        isVerified: false,
      });
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleRevokeVerification = async (userId: string) => {
    setActionLoading(userId + '_revoke');
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verificationStatus: 'none',
        verifiedAt: null,
        verificationExpiresAt: null,
      });
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId + '_delete');
    try {
      await deleteDoc(doc(db, 'users', userId));
      setDeleteConfirm(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleDeletePost = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="size-8 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );

  if ((profile?.role as string) !== 'admin') return null;
  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Admin</p>
            <h1 className="font-display text-3xl leading-none">Dashboard</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Users', value: users.length, icon: Users, color: '#3730A3' },
            { label: 'Posts', value: products.length, icon: FileText, color: '#059669' },
            { label: 'Pending', value: pendingVerifications.length, icon: BadgeCheck, color: '#D97706' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 flex flex-col items-center justify-center text-center">
              <Icon className="w-5 h-5 mb-1.5" style={{ color }} />
              <p className="font-display text-2xl" style={{ color }}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['overview', 'verifications', 'users'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize ${
                activeTab === tab ? 'text-white' : 'bg-white border text-[color:var(--color-foreground)]'
              }`}
              style={activeTab === tab ? { background: 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}>
              {tab === 'verifications' ? `Verifications ${pendingVerifications.length > 0 ? `(${pendingVerifications.length})` : ''}` : tab}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto space-y-4">

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="section-title text-base mb-3">Recent Posts</h3>
              {products.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name || 'Text post'}</p>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">by {p.vendorName}</p>
                  </div>
                  <button onClick={() => handleDeletePost(p.id)}
                    className="ml-3 p-2 rounded-xl shrink-0"
                    style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h3 className="section-title text-base mb-3">Verified Users</h3>
              {verifiedUsers.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">No verified users yet.</p>
              ) : verifiedUsers.map(u => {
                const expiresAt = u.verificationExpiresAt?.toDate?.();
                const daysLeft = expiresAt
                  ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
                  : null;
                const isExpiringSoon = daysLeft !== null && daysLeft <= 5;
                const isExpired = daysLeft !== null && daysLeft <= 0;

                return (
                  <div key={u.id} className="flex items-center justify-between py-2.5 border-b last:border-0"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-muted)' }}>
                        {u.photoUrl
                          ? <Image src={u.photoUrl} alt={u.name} width={32} height={32} className="object-cover w-full h-full" />
                          : <UserIcon className="w-4 h-4 text-[color:var(--color-primary)]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        {daysLeft !== null && (
                          <p className="text-[10px] font-medium"
                            style={{ color: isExpired ? 'var(--color-danger)' : isExpiringSoon ? '#D97706' : 'var(--color-muted-foreground)' }}>
                            {isExpired ? 'Expired' : `${daysLeft}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleRevokeVerification(u.id)}
                      disabled={actionLoading === u.id + '_revoke'}
                      className="ml-3 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                      style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                      {actionLoading === u.id + '_revoke' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Revoke'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Verifications tab */}
        {activeTab === 'verifications' && (
          <div className="space-y-3">
            {pendingVerifications.length === 0 ? (
              <div className="card p-10 text-center">
                <BadgeCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-display text-xl mb-1">All clear</p>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">No pending verification requests.</p>
              </div>
            ) : pendingVerifications.map(u => (
              <div key={u.id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-muted)' }}>
                    {u.photoUrl
                      ? <Image src={u.photoUrl} alt={u.name} width={48} height={48} className="object-cover w-full h-full" />
                      : <UserIcon className="w-5 h-5 text-[color:var(--color-primary)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-[color:var(--color-muted-foreground)] truncate">{u.email}</p>
                    <p className="text-xs mt-0.5 capitalize text-[color:var(--color-muted-foreground)]">{u.role}</p>
                  </div>
                </div>

                {u.shopName && (
                  <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--color-muted)' }}>
                    <p className="text-xs font-semibold">{u.shopName}</p>
                    {u.shopDescription && <p className="text-xs mt-1 text-[color:var(--color-muted-foreground)]">{u.shopDescription}</p>}
                  </div>
                )}

                {u.specialServices && (
                  <p className="text-xs text-[color:var(--color-muted-foreground)] mb-4">
                    <span className="font-semibold text-[color:var(--color-foreground)]">Services: </span>
                    {u.specialServices}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(u.id)}
                    disabled={!!actionLoading}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                    {actionLoading === u.id + '_reject'
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <><X className="w-4 h-4" /> Reject</>}
                  </button>
                  <button
                    onClick={() => handleApprove(u.id, u.email, u.name)}
                    disabled={!!actionLoading}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: '#059669' }}>
                    {actionLoading === u.id + '_approve'
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <><Check className="w-4 h-4" /> Approve</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="card p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-muted)' }}>
                  {u.photoUrl
                    ? <Image src={u.photoUrl} alt={u.name} width={40} height={40} className="object-cover w-full h-full" />
                    : <UserIcon className="w-4 h-4 text-[color:var(--color-primary)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    {u.isVerified && <BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />}
                  </div>
                  <p className="text-xs text-[color:var(--color-muted-foreground)] truncate">{u.email}</p>
                  <p className="text-[10px] capitalize text-[color:var(--color-muted-foreground)]">{u.role}</p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(u.id)}
                  className="p-2 rounded-xl shrink-0"
                  style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete user confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-28">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="font-display text-2xl mb-1">Delete user?</h3>
            <p className="text-sm text-[color:var(--color-muted-foreground)] mb-6">
              This will remove their profile. Their posts will remain unless deleted separately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={actionLoading === deleteConfirm + '_delete'}
                className="flex-1 rounded-[0.875rem] py-3.5 font-semibold text-white"
                style={{ background: 'var(--color-danger)' }}>
                {actionLoading === deleteConfirm + '_delete' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}