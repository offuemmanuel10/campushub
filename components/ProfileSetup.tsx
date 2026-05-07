'use client';

import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { ShoppingBag, Store, ArrowLeft, Check } from 'lucide-react';

export function ProfileSetup() {
  const { user, setProfile } = useAuthStore();
  const [role, setRole] = useState<'buyer' | 'vendor' | null>(null);
  const [name, setName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [specialServices, setSpecialServices] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !role) return;
    setLoading(true);
    setError('');
    try {
      const profileData: any = {
        uid: user.uid,
        email: user.email || '',
        role,
        name,
        isVerified: false,
        createdAt: serverTimestamp(),
      };
      if (user.photoURL) profileData.photoUrl = user.photoURL;
      if (bio.trim()) profileData.bio = bio.trim();
      if (specialServices.trim()) profileData.specialServices = specialServices.trim();
      if (shopName.trim()) profileData.shopName = shopName.trim();
      if (shopDescription.trim()) profileData.shopDescription = shopDescription.trim();

      await setDoc(doc(db, 'users', user.uid), profileData);
      setProfile({ ...profileData, createdAt: new Date().toISOString() } as any);
    } catch (err: any) {
      console.error("Profile setup error:", err);
      setError(err.message);
    } finally { setLoading(false); }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-3">Step 1 of 2</p>
            <h1 className="font-display text-4xl text-[color:var(--color-foreground)] mb-3">Pick your role.</h1>
            <p className="text-[color:var(--color-muted-foreground)]">How will you mainly use Campus Hub?</p>
          </div>

          <div className="space-y-4">
            {[
              { id: 'buyer' as const, icon: ShoppingBag, title: 'I want to buy', desc: 'Browse and purchase from student vendors.' },
              { id: 'vendor' as const, icon: Store, title: 'I want to sell', desc: 'List products and services for the campus.' },
            ].map(({ id, icon: Icon, title, desc }) => (
              <button
                key={id}
                onClick={() => setRole(id)}
                className="w-full card p-5 text-left flex items-center gap-4 hover:border-[color:var(--color-primary)] transition-all group"
              >
                <div className="size-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-[color:var(--color-foreground)]">{title}</h3>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">{desc}</p>
                </div>
                <div className="size-6 rounded-full border-2 border-[color:var(--color-border)] group-hover:border-[color:var(--color-primary)] flex items-center justify-center" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-md mx-auto">
        <button onClick={() => setRole(null)} className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-3">Step 2 of 2</p>
        <h1 className="font-display text-4xl text-[color:var(--color-foreground)] mb-2">Almost there.</h1>
        <p className="text-[color:var(--color-muted-foreground)] mb-8">Tell us a bit about yourself.</p>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">Bio <span className="text-[color:var(--color-muted-foreground)] font-normal">(optional)</span></label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field resize-none h-24" placeholder="A short bio about yourself" />
          </div>
          <div>
            <label className="label">Special Services / Skills <span className="text-[color:var(--color-muted-foreground)] font-normal">(optional)</span></label>
            <textarea value={specialServices} onChange={(e) => setSpecialServices(e.target.value)} className="input-field resize-none h-24" placeholder="e.g. Graphic Design, Tutoring, Custom Clothing" />
          </div>

          <div>
            <label className="label">Shop Name <span className="text-[color:var(--color-muted-foreground)] font-normal">(optional)</span></label>
            <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="input-field" placeholder="Your shop or brand name" />
          </div>
          <div>
            <label className="label">Shop Description <span className="text-[color:var(--color-muted-foreground)] font-normal">(optional)</span></label>
            <textarea value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} className="input-field resize-none h-24" placeholder="What do you sell or offer?" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            <Check className="w-4 h-4" />
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}