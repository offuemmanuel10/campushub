'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc, deleteDoc,
  limit, startAfter, getDocs, QueryDocumentSnapshot,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Image from 'next/image';
import Link from 'next/link';
import {
  Trash2, TrendingUp, ChevronLeft, ChevronRight,
  Tag, BadgeCheck, Sparkles, Heart, MessageCircle,
  Send, Bell, X, CornerDownRight, User as UserIcon,
  ArrowRight
} from 'lucide-react';

const CATEGORIES = ['All', 'Housing', 'Events', 'Electronics', 'Clothing', 'Services', 'Other'];
const PAGE_SIZE = 10;
const AD_INTERVAL = 5; // show ad rows every 5 posts

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

// ── Build comment tree from flat list ──────────────────────────
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

// ── Recursive comment node ─────────────────────────────────────
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

// ── Comment section ────────────────────────────────────────────
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
      // Send notification
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
    // Also delete children
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

// ── Media carousel ─────────────────────────────────────────────
function MediaCarousel({ mediaUrls, imageUrl, name }: {
  mediaUrls?: string[], imageUrl?: string, name: string
}) {
  const [current, setCurrent] = useState(0);
  const media = mediaUrls?.length ? mediaUrls : imageUrl ? [imageUrl] : [];
  if (!media.length) return null;
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i);

  return (
    <div className="relative w-full overflow-hidden bg-black">
      {media.map((url, i) => (
        <div key={i} className={`transition-duration-300 ${i === current ? 'block' : 'hidden'}`}>
          {isVideo(url) ? (
            i === current
              ? <video src={url} className="w-full h-auto max-h-[80vh]" muted loop playsInline autoPlay />
              : null
          ) : (
            <img src={url} alt={`${name} ${i + 1}`} className="w-full h-auto" />
          )}
        </div>
      ))}
      {media.length > 1 && (
        <>
          {current > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {current < media.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); }}
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
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium z-10">
            {current + 1}/{media.length}
          </div>
        </>
      )}
    </div>
  );
}

// ── Profile tap modal ──────────────────────────────────────────
function ProfileModal({ vendor, onClose }: { vendor: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-10"
      onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full"
        onClick={e => e.stopPropagation()}>
        {/* Cover */}
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
          <button onClick={onClose} className="absolute top-3 right-3 size-8 rounded-full bg-black/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Avatar */}
        <div className="px-5 -mt-10 pb-5">
          <div className="size-20 rounded-2xl overflow-hidden border-4 border-white flex items-center justify-center mb-3"
            style={{ background: 'var(--color-muted)' }}>
            {vendor.photoUrl
              ? <Image src={vendor.photoUrl} alt={vendor.vendorName} width={80} height={80} className="object-cover w-full h-full" />
              : <UserIcon className="w-8 h-8 text-[color:var(--color-primary)]" />}
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-display text-xl">{vendor.vendorName}</p>
            {vendor.isVerified && (
              <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
          {vendor.isVerified && (
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>
              {vendor.vendorRole === 'vendor' ? 'Verified Business' : 'Verified User'}
            </p>
          )}
          <Link href={`/shop/${vendor.vendorId}`} onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'var(--color-primary)' }}>
            See Business <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Discover ad row ────────────────────────────────────────────
function BrandsRow({ brands }: { brands: any[] }) {
  if (brands.length === 0) return null;
  return (
    <div className="py-4 bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)] px-4 mb-3">
        Top Brands
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {brands.map(brand => (
          <Link key={brand.id} href={`/shop/${brand.id}`}
            className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="size-14 rounded-full overflow-hidden flex items-center justify-center border"
              style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
              {brand.photoUrl
                ? <Image src={brand.photoUrl} alt={brand.name} width={56} height={56} className="object-cover w-full h-full" />
                : <UserIcon className="w-6 h-6 text-[color:var(--color-primary)]" />}
            </div>
            <p className="text-[10px] font-semibold text-center max-w-[60px] truncate text-[color:var(--color-foreground)]">
              {brand.shopName || brand.name}
            </p>
            {brand.isVerified && (
              <BadgeCheck className="w-3 h-3 -mt-1" style={{ color: 'var(--color-accent)' }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProductsRow({ products }: { products: any[] }) {
  if (products.length === 0) return null;
  return (
    <div className="py-4 bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-muted-foreground)] px-4 mb-3">
        You might like
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {products.map(p => {
          const mediaUrl = p.mediaUrls?.[0] || p.imageUrl;
          const isVideo = mediaUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
          return (
            <Link key={p.id} href={`/shop/${p.vendorId}`}
              className="shrink-0 w-40 rounded-2xl overflow-hidden border"
              style={{ borderColor: 'var(--color-border)' }}>
              {mediaUrl && (
                <div className="w-40 h-40 overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                  {isVideo
                    ? <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline />
                    : <img src={mediaUrl} alt={p.name || 'Product'} className="w-full h-full object-cover" />}
                </div>
              )}
              <div className="p-2.5" style={{ background: 'white' }}>
                {p.category && <p className="text-[9px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] mb-0.5">{p.category}</p>}
                {p.name && <p className="text-xs font-semibold line-clamp-1 text-[color:var(--color-foreground)]">{p.name}</p>}
                {p.price && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    ₦{Number(p.price).toLocaleString()}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
// ── Post card ──────────────────────────────────────────────────
function PostCard({ product, onDelete, canDelete, currentUser, profile, onProfileTap }: {
  product: any, onDelete: () => void, canDelete: boolean,
  currentUser: any, profile: any,
  onProfileTap: (vendor: any) => void
}) {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(product.likes?.includes(currentUser?.uid) || false);
  const [likesCount, setLikesCount] = useState(product.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(0);
useEffect(() => {
  const q = query(collection(db, 'products', product.id, 'comments'));
  return onSnapshot(q, snap => setCommentCount(snap.size));
}, [product.id]);
  const hasMedia = (product.mediaUrls?.length > 0) || !!product.imageUrl;
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
      // Notify post owner
      if (product.vendorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: product.vendorId,
          type: 'like',
          title: `${profile?.name} liked your post`,
          body: product.name || product.description?.slice(0, 60) || 'your post',
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  };

  return (
    <article className="bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Tappable avatar */}
          <button
            onClick={() => onProfileTap({
              vendorId: product.vendorId,
              vendorName: product.vendorName,
              vendorRole: product.vendorRole,
              isVerified: product.isVerified,
              photoUrl: product.vendorPhoto || null,
            })}
            className="size-9 rounded-full overflow-hidden flex items-center justify-center font-semibold text-sm text-white shrink-0 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
            {product.vendorPhoto
              ? <Image src={product.vendorPhoto} alt={product.vendorName} width={36} height={36} className="object-cover w-full h-full" />
              : <span>{product.vendorName?.charAt(0) || 'V'}</span>}
          </button>
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
          <button onClick={onDelete}
            className="size-8 rounded-full flex items-center justify-center transition-all"
            style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Media */}
      {hasMedia && (
        <MediaCarousel mediaUrls={product.mediaUrls} imageUrl={product.imageUrl} name={product.name || ''} />
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
  );
}

// ── Main Marketplace ───────────────────────────────────────────
export function Marketplace() {
  const { user, profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [adProducts, setAdProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [viewingVendor, setViewingVendor] = useState<any | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    return onSnapshot(q, snap => setNotifCount(snap.size));
  }, [user]);

  // Brands for ad rows
  useEffect(() => {
    const q = query(collection(db, 'users'), where('isVerified', '==', true), limit(15));
    return onSnapshot(q, snap => {
      setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Ad products (random sample)
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(20));
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Shuffle for variety
      setAdProducts(all.sort(() => Math.random() - 0.5).slice(0, 10));
    });
  }, []);

  // First page
  useEffect(() => {
    setLoading(true);
    setProducts([]);
    lastDocRef.current = null;
    setHasMore(true);
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...more.filter(p => !ids.has(p.id))];
      });
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteDoc(doc(db, 'products', deleteId)); setDeleteId(null); }
    catch (e) { console.error(e); }
  };

  // Interleave ad rows every AD_INTERVAL posts
  const renderFeed = () => {
const items: React.JSX.Element[] = []
  filteredProducts.forEach((product, index) => {
    items.push(
      <PostCard
        key={product.id}
        product={product}
       canDelete={user?.uid === product.vendorId || (profile?.role as string) === 'admin'}
        onDelete={() => setDeleteId(product.id)}
        currentUser={user}
        profile={profile}
        onProfileTap={setViewingVendor}
      />
    );
    if ((index + 1) % 5 === 0 && index < filteredProducts.length - 1) {
      items.push(<ProductsRow key={`products-${index}`} products={adProducts} />);
    }
    if ((index + 1) % 8 === 0 && index < filteredProducts.length - 1) {
      items.push(<BrandsRow key={`brands-${index}`} brands={brands} />);
    }
  });
  return items;
};
      // Insert ad row after every AD_INTERVAL posts

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-1.5">Welcome back</p>
            <h1 className="font-display text-3xl leading-none text-[color:var(--color-foreground)]">
              {profile?.name?.split(' ')[0] || 'Hello'}.
            </h1>
          </div>
          <Link href="/notifications"
            className="relative size-11 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-muted)' }}>
            <Bell className="w-5 h-5 text-[color:var(--color-foreground)]" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>
        </div>

        {/* Hero card */}
        <div className="rounded-[1.5rem] p-5 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #2a3a66 100%)' }}>
          <div className="absolute -right-8 -top-8 size-32 rounded-full opacity-20" style={{ background: 'var(--color-accent)' }} />
          <div className="absolute -right-16 -bottom-16 size-40 rounded-full opacity-10" style={{ background: 'var(--color-accent)' }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
              <Sparkles className="w-3 h-3" /> What's new
            </span>
            <h2 className="font-display text-white text-2xl leading-tight mb-1">Discover what your campus is selling.</h2>
            <p className="text-white/70 text-sm">Fresh listings from student vendors, posted in real-time.</p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat ? 'text-white shadow-md' : 'bg-white text-[color:var(--color-foreground)] border'
              }`}
              style={activeCategory === cat ? { background: 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}>
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 max-w-2xl mx-auto flex items-center justify-between mb-2">
        <h3 className="section-title text-base">{activeCategory === 'All' ? 'All listings' : activeCategory}</h3>
        <span className="text-xs text-[color:var(--color-muted-foreground)] flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <main className="max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-4 px-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="size-9 rounded-full bg-[color:var(--color-muted)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-[color:var(--color-muted)] rounded w-1/3" />
                    <div className="h-3 bg-[color:var(--color-muted)] rounded w-1/4" />
                  </div>
                </div>
                <div className="w-full aspect-square bg-[color:var(--color-muted)]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[color:var(--color-muted)] rounded w-2/3" />
                  <div className="h-3 bg-[color:var(--color-muted)] rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            {renderFeed()}
            <div ref={sentinelRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="size-2 rounded-full animate-bounce"
                      style={{ background: 'var(--color-primary)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
              {!hasMore && !loadingMore && (
                <p className="text-xs text-[color:var(--color-muted-foreground)] py-4">You're all caught up ✓</p>
              )}
            </div>
          </>
        ) : (
          <div className="card p-10 text-center mx-5">
            <p className="font-display text-xl mb-1">Nothing here yet</p>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">No products in this category. Check back soon.</p>
          </div>
        )}
      </main>

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

      {/* Profile tap modal */}
      {viewingVendor && (
        <ProfileModal vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
      )}
    </div>
  );
}