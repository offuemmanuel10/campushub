'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, X, BadgeCheck, Tag, ChevronLeft, ChevronRight,
  Heart, MessageCircle, Send, Trash2, CornerDownRight, User as UserIcon
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

function buildTree(comments: any[]): any[] {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  comments.forEach(c => { map[c.id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

function CommentNode({
  comment, depth, productId, currentUser, profile,
  onReply, onDelete, onLike
}: {
  comment: any, depth: number, productId: string,
  currentUser: any, profile: any,
  onReply: (id: string, name: string) => void,
  onDelete: (id: string, authorId: string) => void,
  onLike: (id: string, likes: string[]) => void,
}) {
  const liked = comment.likes?.includes(currentUser?.uid);
  const maxDepth = 4;

  return (
    <div style={{ marginLeft: depth > 0 ? Math.min(depth * 14, 42) : 0 }}>
      <div className="flex items-start gap-2 mb-3">
        <div className="size-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--color-muted)' }}>
          {comment.authorPhoto
            ? <Image src={comment.authorPhoto} alt={comment.authorName}
                width={28} height={28} className="object-cover w-full h-full" />
            : <span className="text-[10px] font-bold text-[color:var(--color-primary)]">
                {comment.authorName?.charAt(0)}
              </span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: 'var(--color-muted)' }}>
            <p className="text-xs font-semibold mb-0.5">{comment.authorName}</p>
            <p className="text-sm break-words leading-relaxed">{comment.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <button onClick={() => onLike(comment.id, comment.likes || [])}
              className="flex items-center gap-1 text-[10px] font-semibold transition-all"
              style={{ color: liked ? '#EF4444' : 'var(--color-muted-foreground)' }}>
              <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            {depth < maxDepth && (
              <button
                onClick={() => onReply(comment.id, comment.authorName)}
                className="text-[10px] font-semibold text-[color:var(--color-muted-foreground)]">
                Reply
              </button>
            )}
            {(currentUser?.uid === comment.authorId || profile?.role === 'admin') && (
              <button onClick={() => onDelete(comment.id, comment.authorId)}
                className="text-[10px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {comment.children?.map((child: any) => (
        <CommentNode key={child.id} comment={child} depth={depth + 1}
          productId={productId} currentUser={currentUser} profile={profile}
          onReply={onReply} onDelete={onDelete} onLike={onLike} />
      ))}
    </div>
  );
}

function CommentSection({ productId, currentUser, profile, onCountChange }: {
  productId: string, currentUser: any, profile: any,
  onCountChange: (count: number) => void
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'products', productId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(all);
      onCountChange(all.length);
    });
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
      if (replyTo) {
        const parent = comments.find(c => c.id === replyTo.id);
        if (parent && parent.authorId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: parent.authorId,
            type: 'reply',
            title: `${profile?.name} replied to your comment`,
            body: text.trim().slice(0, 80),
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
      setText('');
      setReplyTo(null);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleLike = async (commentId: string, likes: string[]) => {
    if (!currentUser) return;
    const ref = doc(db, 'products', productId, 'comments', commentId);
    if (likes.includes(currentUser.uid)) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const handleDelete = async (commentId: string, authorId: string) => {
    if (currentUser?.uid !== authorId && profile?.role !== 'admin') return;
    const children = comments.filter(c => c.parentId === commentId);
    await Promise.all(children.map(c => deleteDoc(doc(db, 'products', productId, 'comments', c.id))));
    await deleteDoc(doc(db, 'products', productId, 'comments', commentId));
  };

  const tree = buildTree(comments);

  return (
    <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)] my-3">
        {comments.length} comment{comments.length !== 1 ? 's' : ''}
      </p>
      <div className="mb-4">
        {tree.map(comment => (
          <CommentNode key={comment.id} comment={comment} depth={0}
            productId={productId} currentUser={currentUser} profile={profile}
            onReply={(id, name) => {
              setReplyTo({ id, name });
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            onDelete={handleDelete}
            onLike={handleLike} />
        ))}
      </div>
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-xs"
          style={{ background: 'var(--color-muted)' }}>
          <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-[color:var(--color-muted-foreground)]" />
          <span className="flex-1 text-[color:var(--color-muted-foreground)]">
            Replying to <span className="font-semibold text-[color:var(--color-foreground)]">{replyTo.name}</span>
          </span>
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
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : 'Write a comment...'}
            className="flex-1 bg-transparent text-sm outline-none text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted-foreground)]"
          />
          <button onClick={submit} disabled={submitting || !text.trim()}
            style={{ color: 'var(--color-primary)' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaCarousel({ mediaUrls, imageUrl, name }: {
  mediaUrls?: string[], imageUrl?: string, name: string
}) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const media = mediaUrls?.length ? mediaUrls : imageUrl ? [imageUrl] : [];
  if (!media.length) return null;

  const isVideo = (url: string) => !!url?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < media.length - 1) setCurrent(c => c + 1);
      if (diff < 0 && current > 0) setCurrent(c => c - 1);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: 'var(--color-muted)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {media.map((url, i) => (
        <div key={i} className={i === current ? 'block' : 'hidden'}>
          {isVideo(url) ? (
            i === current ? (
              <video
                src={url}
                className="w-full h-auto max-h-[80vh]"
                controls
                playsInline
                autoPlay
                loop
              />
            ) : null
          ) : (
            <img
              src={url}
              alt={`${name} ${i + 1}`}
              className="w-full h-auto"
            />
          )}
        </div>
      ))}

      {media.length > 1 && (
        <>
          {current > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(c => c - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {current < media.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-white' : 'size-1.5 bg-white/50'}`}
              />
            ))}
          </div>
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium z-10">
            {current + 1}/{media.length}
          </div>
        </>
      )}
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products', product.id, 'comments'));
    return onSnapshot(q, snap => setCommentCount(snap.size));
  }, [product.id]);

  const hasMedia = product.mediaUrls?.length > 0 || !!product.imageUrl;
  const hasPrice = product.price != null && product.price !== '';
  const hasName = !!product.name?.trim();
  const isTextPost = !hasMedia && !hasPrice && !hasName;
  const canDelete = currentUser?.uid === product.vendorId || profile?.role === 'admin';

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteDoc(doc(db, 'products', deleteId)); setDeleteId(null); }
    catch (e) { console.error(e); }
  };

  return (
    <>
      <article className="bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/shop/${product.vendorId}`}>
              <div className="size-9 rounded-full overflow-hidden flex items-center justify-center font-semibold text-sm text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
                {product.vendorPhoto
                  ? <Image src={product.vendorPhoto} alt={product.vendorName} width={36} height={36} className="object-cover w-full h-full rounded-full" />
                  : <span>{product.vendorName?.charAt(0) || 'V'}</span>}
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link href={`/shop/${product.vendorId}`}
                  className="font-semibold text-sm text-[color:var(--color-foreground)] hover:underline underline-offset-2">
                  {product.vendorName}
                </Link>
                {product.isVerified && (
                  <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                )}
              </div>
              <div className="flex items-center gap-1">
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
          {canDelete && (
            <button onClick={() => setDeleteId(product.id)}
              className="size-8 rounded-full flex items-center justify-center transition-all"
              style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Media */}
        {hasMedia && (
          <MediaCarousel
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
                <p className="text-sm text-[color:var(--color-foreground)] leading-relaxed break-words">
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
            <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-current scale-110' : ''}`} />
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
            onCountChange={setCommentCount}
          />
        )}
      </article>

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-28">
          <div className="card p-6 max-w-sm w-full" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <h3 className="font-display text-2xl mb-1">Delete listing?</h3>
            <p className="text-sm text-[color:var(--color-muted-foreground)] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 rounded-[0.875rem] py-3.5 font-semibold text-white"
                style={{ background: 'var(--color-danger)' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
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
        <h1 className="font-display text-3xl mb-5 text-[color:var(--color-foreground)]">Search.</h1>

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