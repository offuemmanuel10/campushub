'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, BadgeCheck, Tag } from 'lucide-react';

const renderWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2" style={{ color: 'var(--color-accent)' }}
          onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function SearchPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = search.trim()
    ? products.filter(p => {
        const lower = search.toLowerCase();
        return (
          p.name?.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.vendorName?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower)
        );
      })
    : [];

  const hasMedia = (p: any) => p.mediaUrls?.length > 0 || !!p.imageUrl;
  const hasPrice = (p: any) => p.price != null && p.price !== '';
  const hasName = (p: any) => !!p.name?.trim();

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-1.5">Discover</p>
        <h1 className="font-display text-3xl mb-5">Search.</h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, products, vendors..."
            className="input-field pl-11 pr-10"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="size-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
          </div>

        ) : !search.trim() ? (
          <div className="px-5 text-center pt-16">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p className="font-display text-xl mb-1">Find anything</p>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              Search by product name, description, vendor or category.
            </p>
          </div>

        ) : filtered.length === 0 ? (
          <div className="px-5 text-center pt-16">
            <p className="font-display text-xl mb-1">No results</p>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              Nothing matched "{search}". Try something else.
            </p>
          </div>

        ) : (
          <>
            <p className="text-xs text-[color:var(--color-muted-foreground)] px-5 mb-3">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
            </p>

            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.map(product => {
                const mediaUrl = product.mediaUrls?.[0] || product.imageUrl;
                const isVideo = mediaUrl?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i);
                const isTextPost = !hasMedia(product) && !hasPrice(product) && !hasName(product);

                return (
                  <article key={product.id} className="bg-white">
                    {/* Post header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <Link href={`/shop/${product.vendorId}`} className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
                          {product.vendorName?.charAt(0) || 'V'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm text-[color:var(--color-foreground)]">{product.vendorName}</p>
                            {product.isVerified && (
                              <BadgeCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                            )}
                          </div>
                          {product.category && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-[color:var(--color-muted-foreground)]" />
                              <span className="text-[11px] text-[color:var(--color-muted-foreground)]">{product.category}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* Media */}
                    {hasMedia(product) && mediaUrl && (
                      <div className="relative w-full aspect-square overflow-hidden bg-black">
                        {isVideo ? (
                          <video src={mediaUrl} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                        ) : (
                          <Image src={mediaUrl} alt={product.name || 'Post'} fill
                            className="object-cover" sizes="(max-width: 768px) 100vw, 640px" />
                        )}
                        {product.mediaUrls?.length > 1 && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs">
                            1/{product.mediaUrls.length}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div className="px-4 pt-3 pb-4">
                      {isTextPost ? (
                        product.description && (
                          <p className="text-[15px] text-[color:var(--color-foreground)] leading-relaxed break-words">
                            {renderWithLinks(product.description)}
                          </p>
                        )
                      ) : (
                        <>
                          {(hasName(product) || hasPrice(product)) && (
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              {hasName(product) && (
                                <h3 className="font-semibold text-[color:var(--color-foreground)] text-[15px] leading-snug flex-1">
                                  {product.name}
                                </h3>
                              )}
                              {hasPrice(product) && (
                                <span className="font-display text-lg shrink-0" style={{ color: 'var(--color-primary)' }}>
                                  ₦{Number(product.price).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                          {product.description && (
                            <p className="text-sm text-[color:var(--color-muted-foreground)] leading-relaxed line-clamp-3 break-words">
                              {renderWithLinks(product.description)}
                            </p>
                          )}
                        </>
                      )}
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