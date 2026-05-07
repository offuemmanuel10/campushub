'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import {
  BadgeCheck, ExternalLink, User as UserIcon, Store,
  Link as LinkIcon, ArrowLeft
} from 'lucide-react';

interface CatalogItem {
  mediaUrl: string;
  caption: string;
  price: string;
}

const DEFAULT_THEME = {
  primary: '#1B2B5E',
  secondary: '#1a2a55',
  tertiary: '#2d1a55',
  accent: '#60A5FA',
  accentSoft: 'rgba(96,165,250,0.2)',
  accentText: '#93C5FD',
};

function shiftColor(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

function getTheme(themeColor?: string) {
  if (!themeColor) return DEFAULT_THEME;
  return {
    primary: themeColor,
    secondary: shiftColor(themeColor, -20),
    tertiary: shiftColor(themeColor, -40),
    accent: '#60A5FA',
    accentSoft: 'rgba(96,165,250,0.2)',
    accentText: '#93C5FD',
  };
}

export default function ShopPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = React.use(params);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      setShop({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="size-8 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <Store className="w-12 h-12 mb-4 opacity-20" />
      <h1 className="font-display text-2xl mb-2">Shop not found</h1>
      <p className="text-[color:var(--color-muted-foreground)] mb-6">This shop doesn't exist or may have been removed.</p>
      <Link href="/" className="btn-primary">Back to Campus Hub</Link>
    </div>
  );

  const theme = getTheme(shop.themeColor);
  const catalogItems: CatalogItem[] = shop.catalogItems || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-12 pb-24 text-center"
        style={{ background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.secondary} 60%, ${theme.tertiary} 100%)` }}>
        <div className="absolute -left-16 -top-16 size-64 rounded-full opacity-10" style={{ background: theme.accent }} />
        <div className="absolute -right-8 bottom-0 size-48 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full opacity-5" style={{ background: 'white' }} />

        <div className="relative max-w-2xl mx-auto">
          {/* Back button */}
          <Link href="/brands"
            className="absolute left-0 top-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          {/* Avatar */}
          <div className="mx-auto mb-5 size-24 rounded-3xl overflow-hidden flex items-center justify-center border-4 border-white/20 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            {shop.photoUrl ? (
              <Image src={shop.photoUrl} alt={shop.name} width={96} height={96} className="object-cover w-full h-full" />
            ) : (
              <UserIcon className="w-10 h-10 text-white/70" />
            )}
          </div>

          {/* Name + badge */}
          <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
            <h1 className="font-display text-4xl text-white leading-tight break-words">
              {shop.shopName || shop.name}
            </h1>
            {shop.isVerified && (
              <BadgeCheck className="w-6 h-6 shrink-0 mt-1" style={{ color: theme.accent }} />
            )}
          </div>

          {shop.shopName && (
            <p className="text-white/60 text-sm mb-3">by {shop.name}</p>
          )}

          {shop.isVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: theme.accentSoft, color: theme.accentText }}>
              <BadgeCheck className="w-3.5 h-3.5" />
              {shop.role === 'vendor' ? 'Verified Business' : 'Verified Creator'}
            </span>
          )}

          {shop.shopDescription && (
            <p className="text-white/80 text-base leading-relaxed max-w-md mx-auto mb-6">
              {shop.shopDescription}
            </p>
          )}

          {/* Contact link buttons */}
          {shop.contactLinks?.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {shop.contactLinks.map((link: any, i: number) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}>
                  <LinkIcon className="w-3.5 h-3.5" />
                  {link.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Wave divider */}
      <div className="-mt-1" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none" className="w-full h-10">
          <path d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60Z" fill="var(--color-background)" />
        </svg>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-24 space-y-10 -mt-2">

        {/* About */}
        {shop.bio && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)] mb-3">About</p>
            <div className="card p-5">
              <p className="text-sm leading-relaxed text-[color:var(--color-foreground)]">{shop.bio}</p>
            </div>
          </section>
        )}

        {/* Services */}
        {shop.specialServices && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)] mb-3">
              Services & Skills
            </p>
            <div className="card p-5">
              <div className="flex flex-wrap gap-2">
                {shop.specialServices.split(/[,\n]/).map((s: string, i: number) => s.trim() && (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Catalog */}
        {catalogItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)]">
                Products & Work
              </p>
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                {catalogItems.length} item{catalogItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {catalogItems.map((item, i) => {
                const isVideo = item.mediaUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
                return (
                  <button key={i} onClick={() => setActiveItem(item)}
                    className="card overflow-hidden text-left group transition-all hover:scale-[1.02]">
                   <div className="relative w-full" style={{ background: 'var(--color-muted)' }}>
  {isVideo ? (
    <video src={item.mediaUrl} className="w-full h-auto" muted loop playsInline />
  ) : item.mediaUrl ? (
    <img src={item.mediaUrl} alt={item.caption || `Item ${i + 1}`} className="w-full h-auto" />
  ) : null}
</div>
                    <div className="p-3">
                      {item.caption && (
                        <p className="text-xs font-semibold line-clamp-2 text-[color:var(--color-foreground)]">{item.caption}</p>
                      )}
                      {item.price && (
                        <p className="font-display text-base mt-1" style={{ color: theme.primary }}>
                          ₦{Number(item.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* External catalog link */}
        {shop.catalogUrl && (
          <section>
            <a href={shop.catalogUrl} target="_blank" rel="noopener noreferrer"
              className="card p-5 flex items-center justify-between group hover:scale-[1.01] transition-all">
              <div>
                <p className="font-semibold text-[color:var(--color-foreground)]">Full Catalog</p>
                <p className="text-xs text-[color:var(--color-muted-foreground)] mt-0.5">View all products & services</p>
              </div>
              <ExternalLink className="w-5 h-5 text-[color:var(--color-muted-foreground)]" />
            </a>
          </section>
        )}

        {/* Contact Links */}
        {shop.contactLinks?.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)] mb-3">
              Get in touch
            </p>
            <div className="space-y-2">
              {shop.contactLinks.map((link: any, i: number) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="card flex items-center gap-4 p-4 hover:scale-[1.01] transition-all group">
                  <div className="size-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--color-muted)' }}>
                    <LinkIcon className="w-4 h-4" style={{ color: theme.primary }} />
                  </div>
                  <span className="font-semibold flex-1 text-[color:var(--color-foreground)]">{link.title}</span>
                  <ExternalLink className="w-4 h-4 text-[color:var(--color-muted-foreground)]" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t pt-8 pb-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/"
            className="inline-flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span>Powered by Campus Hub</span>
          </Link>
        </div>
      </div>

      {/* Catalog item modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setActiveItem(null)}>
          <div className="bg-white rounded-3xl overflow-hidden"
  style={{ maxWidth: '95vw' }}
  onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center bg-black">
  {activeItem.mediaUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
    <video src={activeItem.mediaUrl} className="max-w-full h-auto" controls autoPlay />
  ) : (
    <img src={activeItem.mediaUrl} alt={activeItem.caption || 'Product'} className="max-w-full h-auto block" />
  )}
</div>
            
            <div className="p-5">
              {activeItem.caption && (
                <h3 className="font-display text-xl mb-1">{activeItem.caption}</h3>
              )}
              {activeItem.price && (
                <p className="text-2xl font-display" style={{ color: theme.primary }}>
                  ₦{Number(activeItem.price).toLocaleString()}
                </p>
              )}
              {shop.contactLinks?.length > 0 && (
                <a href={shop.contactLinks[0].url} target="_blank" rel="noopener noreferrer"
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: theme.primary }}>
                  Contact to Order
                </a>
              )}
              <button onClick={() => setActiveItem(null)}
                className="w-full mt-3 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}