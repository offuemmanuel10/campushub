'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, X, BadgeCheck, Tag, ChevronLeft, ChevronRight,
  Heart, MessageCircle, Send, Trash2, CornerDownRight
} from 'lucide-react';

const renderWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium"
          style={{ color: 'var(--color-accent)' }}
          onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return part;
  });
};

function SwipeableCarousel({ mediaUrls, imageUrl, name }: {
  mediaUrls?: string[], imageUrl?: string, name: string
}) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const media = mediaUrls?.length ? mediaUrls : imageUrl ? [imageUrl] : [];
  if (!media.length) return null;

  const isVideo = (url: string) => !!url?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i);
  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(media.length - 1, c + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="relative w-full overflow-hidden bg-black select-none"
      style={{ aspectRatio: '1/1' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {media.map((url, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-300 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {isVideo(url) ? (
            i === current
              ? <video src={url} className="w-full h-full object-contain" muted loop playsInline autoPlay />
              : null
          ) : (
            <Image src={url} alt={`${name} ${i + 1}`} fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 640px"
              loading={i === 0 ? 'eager' : 'lazy'} />
          )}
        </div>
      ))}
      {media.length > 1 && (
        <>
          {current > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {current < media.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {media.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-white' : 'size-1.5 bg-white/50'}`} />
            ))}
          </div>
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs z-10">
            {current + 1}/{media.length}
          </div>
        </>
      )}
    </div>
  );
}

function CommentSection({ productId, currentUser, profile }: {
  productId: string, currentUser: any, profile: any
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'products', productId, 'comments'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [productId]);

  const submit = async () => {
    if (!text.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'products', productId, 'comments'), {
        text: text.trim(),
        authorId: currentUser.uid,
        authorName: profile?.name || 'User',
        authorPhoto: profile?.photoUrl || null,
        createdAt: serverTimestamp(),
        likes: [],
        parentId: replyTo?.id || null,
      });
      setText('');
      setReplyTo(null);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (id: string) => comments.filter(c => c.parentId === id);

  return (
    <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)] my-3">
        {comments.length} comment{comments.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-3 mb-4">
        {topLevel.map(comment => (
          <div key={comment.id}>
            <div className="flex items-start gap-2">
              <div className="size-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-muted)' }}>
                {comment.authorPhoto
                  ? <Image src={comment.authorPhoto} alt={comment.authorName} width={28} height={28} className="object-cover w-full h-full" />
                  : <span className="text-[10px] font-bold text-[color:var(--color-primary)]">{comment.authorName?.charAt(0)}</span>}
              </div>
              <div className="flex-1">
                <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: 'var(--color-muted)' }}>
                  <p className="text-xs font-semibold mb-0.5">{comment.authorName}</p>
                  <p className="text-sm break-words">{comment.text}</p>
                </div>
                <button onClick={() => { setReplyTo({ id: comment.id, name: comment.authorName }); setTimeout(() => inputRef.current?.focus(), 100); }}
                  className="text-[10px] font-semibold text-[color:var(--color-muted-foreground)] mt-1 ml-1">
                  Reply
                </button>
                {getReplies(comment.id).map(reply => (
                  <div key={reply.id} className="flex items-start gap-2 mt-2 pl-3 border-l-2" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="size-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: 'var(--color-muted)' }}>
                      {reply.authorPhoto
                        ? <Image src={reply.authorPhoto} alt={reply.authorName} width={24} height={24} className="object-cover w-full h-full" />
                        : <span className="text-[9px] font-bold text-[color:var(--color-primary)]">{reply.authorName?.charAt(0)}</span>}
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-3 py-2 flex-1" style={{ background: 'var(--color-muted)' }}>
                      <p className="text-[10px] font-semibold mb-0.5">{reply.authorName}</p>
                      <p className="text-xs break-words">{reply.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-xs"
          style={{ background: 'var(--color-muted)' }}>
          <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-[color:var(--color-muted-foreground)]" />
          <span className="flex-1">Replying to <span className="font-semibold">{replyTo.name}</span></span>
          <button onClick={() => setReplyTo(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="size-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-muted)' }}>
          {profile?.photoUrl
            ? <Image src={profile.photoUrl} alt="You" width={28} height={28} className="object-cover w-full h-full" />
            : <span className="text-[10px] font-bold text-[color:var(--color-primary)]">{profile?.name?.charAt(0)}</span>}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
          style={{ background: 'var(--color-muted)' }}>
          <input ref={inputRef} type="text" value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : 'Write a comment...'}
            className="flex-1 bg-transparent text-sm outline-none text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted-foreground)]" />
          <button onClick={submit} disabled={submitting || !text.trim()}
            style={{ color: 'var(--color-primary)' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPostCard({ product, currentUser, profile }: {
  product: any, currentUser: any, profile: any
}) {
  const [liked, setLiked] = useState(product.likes?.includes(currentUser?.uid) || false);
  const [likesCount, setLikesCount] = useState(product.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const hasMedia = product.mediaUrls?.length > 0 || !!product.imageUrl;
  const hasPrice = product.price != null && product.price !== '';
  const hasName = !!product.name?.trim();
  const isTextPost = !hasMedia && !hasPrice && !hasName;

  const toggleLike = async () => {
    if (!currentUser) return;
    const ref = doc(db, 'products', product.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
      setLiked(false);
      setLikesCount((c: number) => Math.max(0, c - 1));
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
      setLiked(true);
      setLikesCount((c: number) => c + 1);
    }
  };

  return (
    <article className="bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/shop/${product.vendorId}`}>
          <div className="size-9 rounded-full overflow-hidden flex items-center justify-center font-semibold text-sm text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
            {product.vendorPhoto
              ? <Image src={product.vendorPhoto} alt={product.vendorName} width={36} height={36} className="object-cover w-full h-full rounded-full" />
              : <span>{product.vendorName?.charAt(0) || 'V'}</span>}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/shop/${product.vendorId}`}
              className="font-semibold text-sm text-[color:var(--color-foreground)] hover:underline underline-offset-2">
              {product.vendorName}
            </Link>
            {product.isVerified && (
              <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {product.isVerified && (
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>
                {product.vendorRole === 'vendor' ? 'Verified Business' : 'Verified User'}
                {product.category ? ' · ' : ''}
              </span>
            )}
            {product.category && (
              <div className="flex items-center gap-0.5">
                <Tag className="w-3 h-3 text-[color:var(--color-muted-foreground)]" />
                <span className="text-[11px] text-[color:var(--color-muted-foreground)]">{product.category}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media */}
      {hasMedia && (
        <SwipeableCarousel
          mediaUrls={product.mediaUrls}
          imageUrl={product.imageUrl}
          name={product.name || 'Post'}
        />
      )}

      {/* Body */}
      <div className={`px-4 ${isTextPost ? 'py-4' : 'pt-3 pb-2'}`}>
        {isTextPost ? (
          product.description && (
            <p className="text-[15px] text-[color:var(--color-foreground)] leading-relaxed break-words">
              {renderWithLinks(product.description)}
            </p>
          )
        ) : (
          <>
            {(hasName || hasPrice) && (
              <div className="flex items-start justify-between gap-3 mb-2">
                {hasName && (
                  <h3 className="font-semibold text-[color:var(--color-foreground)] text-[15px] leading-snug flex-1">
                    {product.name}
                  </h3>
                )}
                {hasPrice && (
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

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-5">
        <button onClick={toggleLike}
          className="flex items-center gap-1.5 text-sm font-semibold transition-all"
          style={{ color: liked ? '#EF4444' : 'var(--color-muted-foreground)' }}>
          <Heart className={`w-5 h-5 ${liked ? 'fill-current scale-110' : ''}`} />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>
        <button onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: showComments ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
          <MessageCircle className="w-5 h-5" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {showComments && (
        <CommentSection
          productId={product.id}
          currentUser={currentUser}
          profile={profile}
        />
      )}
    </article>
  );
}

export default function SearchPage() {
  const { user, profile } = useAuthStore();
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

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-1.5">Discover</p>
        <h1 className="font-display text-3xl mb-5">Search.</h1>

        {/* Fixed search bar — no overlap */}
        <div className="flex items-center gap-3 px-4 rounded-2xl border bg-white"
          style={{ borderColor: 'var(--color-border)' }}>
          <Search className="w-4 h-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, products, vendors..."
            className="flex-1 py-3 bg-transparent text-sm outline-none text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted-foreground)]"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] shrink-0">
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
            <div>
              {filtered.map(product => (
                <SearchPostCard
                  key={product.id}
                  product={product}
                  currentUser={user}
                  profile={profile}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}