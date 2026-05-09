'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BottomNav } from '@/components/BottomNav';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, User as UserIcon, Store, Search, X, ArrowRight } from 'lucide-react';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BrandsPage() {
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [shuffled, setShuffled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isVerified', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVerifiedUsers(users);
      setShuffled(shuffleArray(users));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const base = search.trim() ? verifiedUsers : shuffled;
    if (!search.trim()) return base;
    const lower = search.toLowerCase();
    return base.filter((u: any) =>
      u.name?.toLowerCase().includes(lower) ||
      u.shopName?.toLowerCase().includes(lower) ||
      u.specialServices?.toLowerCase().includes(lower)
    );
  }, [search, verifiedUsers, shuffled]);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <span className="pill mb-3">
          <BadgeCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />Verified
        </span>
        <h1 className="font-display text-3xl mb-1">Top Creators, Brands & Services.</h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)] mb-5">
          Want your business listed here? Go to your profile, tap Request Verification and follow the instructions.
        </p>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, shop or service..."
            className="input-field pl-11 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="size-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <BadgeCheck className="w-10 h-10 mx-auto mb-4 text-[color:var(--color-muted-foreground)] opacity-40" />
            <h2 className="font-display text-xl mb-1">
              {search ? 'No results found' : 'No verified brands yet'}
            </h2>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {search
                ? `Nothing matched "${search}". Try a different search.`
                : 'Check back soon as student vendors get verified.'}
            </p>
          </div>
        ) : (
          <>
            {search && (
              <p className="text-xs text-[color:var(--color-muted-foreground)] mb-4">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
              </p>
            )}
            <div className="space-y-5">
              {filtered.map((user) => {
                const catalogItems = user.catalogItems || [];
                return (
                  <article key={user.id} className="card overflow-hidden">

                    {/* Header — clickable to shop */}
                    <Link href={`/shop/${user.id}`} className="flex items-center gap-4 p-5 hover:bg-[color:var(--color-muted)] transition-all">
                      <div className="relative size-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-muted)' }}>
                        {user.photoUrl ? (
                          <Image src={user.photoUrl} alt={user.name} fill className="object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-[color:var(--color-primary)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-display text-lg break-words leading-snug">{user.name}</h2>
                          <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        {user.shopName && (
                          <div className="flex items-center gap-1 text-xs text-[color:var(--color-muted-foreground)] mt-0.5">
                            <Store className="w-3 h-3 shrink-0" />
                            <span className="break-words">{user.shopName}</span>
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
                    </Link>

                    {/* Services */}
                    {user.specialServices && (
                      <div className="px-5 pb-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)] mb-2">
                          Services & skills
                        </p>
                        <p className="text-sm text-[color:var(--color-foreground)] leading-relaxed">
                          {user.specialServices}
                        </p>
                      </div>
                    )}

                    {/* Horizontal catalog scroll */}
                    {catalogItems.length > 0 && (
                      <div className="px-5 pb-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)] mb-2">
                          Products
                        </p>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                          {catalogItems.map((item: any, i: number) => {
                            const isVideo = item.mediaUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
                            return (
                              <Link key={i} href={`/shop/${user.id}`}
                                className="shrink-0 w-28 rounded-xl overflow-hidden border transition-all hover:scale-[1.02]"
                                style={{ borderColor: 'var(--color-border)' }}>
                               <div className="relative w-28" style={{ background: 'var(--color-muted)' }}>
  {isVideo ? (
    <video src={item.mediaUrl} className="w-full h-auto" muted playsInline />
  ) : item.mediaUrl ? (
    <img src={item.mediaUrl} alt={item.caption || `Item ${i + 1}`} className="w-full h-auto" />
  ) : null}
</div>
                                <div className="p-2" style={{ background: 'var(--color-surface)' }}>
                                  {item.caption && (
                                    <p className="text-[10px] font-semibold line-clamp-1 text-[color:var(--color-foreground)]">
                                      {item.caption}
                                    </p>
                                  )}
                                  {item.price && (
                                    <p className="text-[10px] font-display mt-0.5" style={{ color: 'var(--color-primary)' }}>
                                      ₦{Number(item.price).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Visit Shop button */}
                    <div className="px-5 pb-5">
                     <Link href={`/shop/${user.id}`}
  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
  style={{ background: '#3730A3' }}>
  <ExternalLink className="w-4 h-4" />
  View this business
</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}