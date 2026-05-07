'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { useRouter } from 'next/navigation';
import {
  LogOut, BadgeCheck, Store, User as UserIcon, Edit2, X, Save,
  Camera, ExternalLink, Plus, Link as LinkIcon, Trash2, Clock,
  Image as ImageIcon, DollarSign
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CLOUD_NAME = 'dqkcav8ep';
const UPLOAD_PRESET = 'marketplace_uploads';

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

interface CatalogItem {
  mediaUrl: string;
  caption: string;
  price: string;
}

interface CatalogDraft {
  file: File | null;
  preview: string;
  caption: string;
  price: string;
  existingUrl?: string;
}

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', bio: '', shopName: '', shopDescription: '',
    contactLinks: [] as { title: string, url: string }[],
    specialServices: '',
    catalogUrl: '',
  });
  const [catalogDrafts, setCatalogDrafts] = useState<CatalogDraft[]>([]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/onboarding');
  };

  const handleRequestVerification = async () => {
    if (!profile) return;
    setRequesting(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        verificationStatus: 'pending',
        verificationRequestedAt: new Date()
      });
      setProfile({ ...profile, verificationStatus: 'pending' } as any);
      alert('Verification request sent! An admin will review your profile.');
    } catch (error) { console.error(error); }
    finally { setRequesting(false); }
  };

  const startEditing = () => {
    setEditForm({
      name: profile?.name || '',
      bio: profile?.bio || '',
      shopName: profile?.shopName || '',
      shopDescription: profile?.shopDescription || '',
      contactLinks: profile?.contactLinks || [],
      specialServices: profile?.specialServices || '',
      catalogUrl: profile?.catalogUrl || '',
    });
 const existing: CatalogDraft[] = ((profile?.catalogItems as CatalogItem[]) || []).map((item: CatalogItem) => ({
  file: null,
      preview: item.mediaUrl,
      caption: item.caption || '',
      price: item.price || '',
      existingUrl: item.mediaUrl,
    }));
    setCatalogDrafts(existing);
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const addCatalogItem = () => {
    setCatalogDrafts(prev => [...prev, { file: null, preview: '', caption: '', price: '' }]);
  };

  const removeCatalogItem = (index: number) => {
    setCatalogDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const updateCatalogDraft = (index: number, field: keyof CatalogDraft, value: string) => {
    setCatalogDrafts(prev => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const handleCatalogFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCatalogDrafts(prev => {
        const next = [...prev];
        next[index] = { ...next[index], file, preview: URL.createObjectURL(file) };
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let newPhotoUrl = profile.photoUrl;
      if (avatarFile) {
        newPhotoUrl = await uploadToCloudinary(avatarFile, `profiles/${profile.uid}`);
      }

      const catalogItems: CatalogItem[] = [];
      for (const draft of catalogDrafts) {
        if (!draft.preview && !draft.file) continue;
        let mediaUrl = draft.existingUrl || '';
        if (draft.file) {
          mediaUrl = await uploadToCloudinary(draft.file, `catalogs/${profile.uid}`);
        }
        if (mediaUrl) {
          catalogItems.push({
            mediaUrl,
            caption: draft.caption.trim(),
            price: draft.price.trim(),
          });
        }
      }

      const updates: any = { name: editForm.name.trim() };
      if (newPhotoUrl) updates.photoUrl = newPhotoUrl;
      if (editForm.bio.trim() !== undefined) updates.bio = editForm.bio.trim();
      if (editForm.specialServices.trim() !== undefined) updates.specialServices = editForm.specialServices.trim();
      updates.shopName = editForm.shopName.trim();
      updates.shopDescription = editForm.shopDescription.trim();
      updates.catalogItems = catalogItems;

      let catalog = editForm.catalogUrl.trim();
      if (catalog && !catalog.startsWith('http')) catalog = 'https://' + catalog;
      updates.catalogUrl = catalog;

      updates.contactLinks = editForm.contactLinks
        .filter(link => link.title.trim() && link.url.trim())
        .map(link => ({
          title: link.title.trim(),
          url: link.url.trim().startsWith('http') ? link.url.trim() : 'https://' + link.url.trim()
        }));

      await updateDoc(doc(db, 'users', profile.uid), updates);
      setProfile({ ...profile, ...updates });
      setIsEditing(false);
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  if (!profile) return null;

 const catalogItems: CatalogItem[] = (profile.catalogItems as CatalogItem[]) || [];
  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-1.5">Account</p>
          <h1 className="font-display text-3xl">Your profile.</h1>
        </div>
        {!isEditing ? (
          <button onClick={startEditing} className="size-10 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: 'var(--color-border)' }} aria-label="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => setIsEditing(false)} className="size-10 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: 'var(--color-border)' }} aria-label="Cancel">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      <main className="px-5 max-w-2xl mx-auto space-y-5">
        {isEditing ? (
          <div className="card p-6 space-y-5">
            <h2 className="section-title text-xl">Edit profile</h2>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative size-24 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
                {avatarPreview || profile.photoUrl ? (
                  <Image src={avatarPreview || profile.photoUrl || ''} alt="Profile" fill className="object-cover" />
                ) : (
                  <UserIcon className="w-9 h-9 text-[color:var(--color-primary)]" />
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition">
                  <Camera className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
                </label>
              </div>
              <p className="text-xs text-[color:var(--color-muted-foreground)] mt-2">Tap to change photo</p>
            </div>

            <div>
              <label className="label">Full Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="input-field resize-none h-20" />
            </div>
            <div>
              <label className="label">Special Services / Skills</label>
              <textarea value={editForm.specialServices} onChange={(e) => setEditForm({ ...editForm, specialServices: e.target.value })} className="input-field resize-none h-20" placeholder="E.g. Graphic Design, Tutoring..." />
            </div>
            <div>
              <label className="label">Shop Name <span className="font-normal text-[color:var(--color-muted-foreground)]">(optional)</span></label>
              <input type="text" value={editForm.shopName} onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Shop Description <span className="font-normal text-[color:var(--color-muted-foreground)]">(optional)</span></label>
              <textarea value={editForm.shopDescription} onChange={(e) => setEditForm({ ...editForm, shopDescription: e.target.value })} className="input-field resize-none h-20" />
            </div>

            {/* Catalog */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Product Catalog</label>
                <button type="button" onClick={addCatalogItem}
                  className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                  <Plus className="w-4 h-4" /> Add item
                </button>
              </div>
              <p className="text-xs text-[color:var(--color-muted-foreground)] mb-3">
                Upload photos or videos of your products — each with a caption and price.
              </p>

              {catalogDrafts.length === 0 && (
                <button type="button" onClick={addCatalogItem}
                  className="w-full py-8 rounded-2xl border-2 border-dashed text-sm text-center"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  Tap "Add item" to build your catalog
                </button>
              )}

              <div className="space-y-4">
                {catalogDrafts.map((draft, index) => (
                  <div key={index} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                    <label className="block relative cursor-pointer">
                      {draft.preview ? (
                        <div className="relative w-full aspect-video bg-black">
                          {draft.file?.type.startsWith('video/') || draft.preview.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                            <video src={draft.preview} className="w-full h-full object-cover" muted />
                          ) : (
                            <Image src={draft.preview} alt="catalog item" fill className="object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-video flex flex-col items-center justify-center gap-2"
                          style={{ background: 'var(--color-muted)' }}>
                          <ImageIcon className="w-8 h-8 opacity-30" />
                          <span className="text-xs text-[color:var(--color-muted-foreground)]">Tap to upload photo or video</span>
                        </div>
                      )}
                      <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => handleCatalogFileChange(index, e)} />
                    </label>

                    <div className="p-3 space-y-2" style={{ background: 'var(--color-surface)' }}>
                      <input
                        type="text"
                        placeholder="Caption (e.g. Blue Ankara Dress)"
                        value={draft.caption}
                        onChange={(e) => updateCatalogDraft(index, 'caption', e.target.value)}
                        className="input-field text-sm"
                      />
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] font-medium text-sm">₦</span>
                        <input
                          type="number"
                          placeholder="Price (optional)"
                          value={draft.price}
                          onChange={(e) => updateCatalogDraft(index, 'price', e.target.value)}
                          className="input-field pl-8 text-sm"
                        />
                      </div>
                      <button type="button" onClick={() => removeCatalogItem(index)}
                        className="text-xs font-medium flex items-center gap-1 mt-1"
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 className="w-3.5 h-3.5" /> Remove item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Links */}
            <div>
              <label className="label">Contact Links</label>
              {editForm.contactLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input type="text" placeholder="Title" value={link.title}
                    onChange={(e) => { const n = [...editForm.contactLinks]; n[index].title = e.target.value; setEditForm({ ...editForm, contactLinks: n }); }}
                    className="input-field flex-1 text-sm" />
                  <input type="text" placeholder="URL" value={link.url}
                    onChange={(e) => { const n = [...editForm.contactLinks]; n[index].url = e.target.value; setEditForm({ ...editForm, contactLinks: n }); }}
                    className="input-field flex-1 text-sm" />
                  <button onClick={() => setEditForm({ ...editForm, contactLinks: editForm.contactLinks.filter((_, i) => i !== index) })}
                    className="size-10 rounded-xl flex items-center justify-center" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setEditForm({ ...editForm, contactLinks: [...editForm.contactLinks, { title: '', url: '' }] })}
                className="text-sm font-semibold flex items-center gap-1 mt-2" style={{ color: 'var(--color-accent)' }}>
                <Plus className="w-4 h-4" /> Add link
              </button>
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="card overflow-hidden">
              <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, var(--color-primary), #2a3a66)' }}>
                <div className="absolute -right-6 -top-6 size-28 rounded-full opacity-30" style={{ background: 'var(--color-accent)' }} />
              </div>
              <div className="px-6 pb-6 -mt-12">
                <div className="relative z-10 size-24 rounded-full overflow-hidden flex items-center justify-center bg-white border-4" style={{ borderColor: 'var(--color-surface)' }}>
                  <div className="size-full flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
                    {profile.photoUrl ? (
                      <Image src={profile.photoUrl} alt="Profile" width={96} height={96} className="object-cover w-full h-full" />
                    ) : (
                      <UserIcon className="w-9 h-9 text-[color:var(--color-primary)]" />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h2 className="font-display text-2xl">{profile.name}</h2>
                  {profile.isVerified && <BadgeCheck className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />}
                </div>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">{profile.email}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="pill capitalize">
                    {profile.role === 'vendor' ? <Store className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                    {profile.role}
                  </span>
                  {profile.isVerified && (
                    <span className="pill" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                {profile.bio && <p className="text-sm mt-4 leading-relaxed">{profile.bio}</p>}
                {profile.specialServices && (
                  <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--color-muted)' }}>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)] mb-1">Special services</p>
                    <p className="text-sm">{profile.specialServices}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Virtual Shop info card */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <h3 className="section-title text-lg">Your Virtual Shop</h3>
              </div>
              <p className="text-sm text-[color:var(--color-muted-foreground)] leading-relaxed mb-4">
                The details you added when setting up your profile have been used to create a website for your business. Any product you upload on Campus Hub will reflect on it automatically. To edit any info, update your profile and it'll update instantly.
              </p>
              {profile.isVerified ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--color-muted-foreground)] leading-relaxed">
                    Since you're verified, congratulations you now have a business website and your shop is <span className="font-semibold text-[color:var(--color-foreground)]">visible to all users</span> on the app and the link below can be shared with customers outside Campus Hub.
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--color-muted)' }}>
                    <span className="text-xs text-[color:var(--color-muted-foreground)] flex-1 truncate">
                      campushub.app/shop/{profile.uid}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://campushub.app/shop/${profile.uid}`);
                        alert('Link copied!');
                      }}
                      className="text-xs font-semibold shrink-0"
                      style={{ color: 'var(--color-accent)' }}>
                      Copy
                    </button>
                  </div>
                  <Link
                    href={`/shop/${profile.uid}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    <ExternalLink className="w-4 h-4" /> View your virtual shop
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl" style={{ background: '#EEF2FF' }}>
                    <p className="text-sm font-semibold" style={{ color: '#3730A3' }}>Your shop link</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: '#3730A3', opacity: 0.8 }}>
                      Your website exists but is not publicly visible. Verify your account to unlock your shareable link and get discovered by everyone on the app.
                    </p>
                  </div>
                  <Link
                    href={`/shop/${profile.uid}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                    <ExternalLink className="w-4 h-4" /> Preview your shop
                  </Link>
                </div>
              )}
            </div>

            {/* Shop + Catalog */}
            <div className="card p-6">
              <h3 className="section-title text-lg mb-4">Shop & Catalog</h3>
              {profile.shopName && (
                <div className="space-y-3 mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)]">Shop name</p>
                    <p className="font-medium mt-0.5">{profile.shopName}</p>
                  </div>
                  {profile.shopDescription && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)]">Description</p>
                      <p className="text-sm mt-0.5">{profile.shopDescription}</p>
                    </div>
                  )}
                </div>
              )}
              {catalogItems.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--color-muted-foreground)] mb-3">Products</p>
                  <div className="grid grid-cols-2 gap-3">
                    {catalogItems.map((item, i) => {
                      const isVideo = item.mediaUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
                      return (
                        <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                         <div className="relative w-full" style={{ background: 'var(--color-muted)' }}>
  {isVideo ? (
    <video src={item.mediaUrl} className="w-full h-auto" muted loop playsInline />
  ) : (
    <img src={item.mediaUrl} alt={item.caption || `Item ${i + 1}`} className="w-full h-auto" />
  )}
</div>
                          <div className="p-2.5">
                            {item.caption && <p className="text-xs font-medium line-clamp-2">{item.caption}</p>}
                            {item.price && (
                              <p className="text-sm font-display mt-1" style={{ color: 'var(--color-primary)' }}>
                                ₦{Number(item.price).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button onClick={startEditing} className="text-sm flex items-center gap-1 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">
                  No Product catalog yet. Tap to add items <Plus className="w-4 h-4" />
                </button>
              )}
              {!profile.isVerified && (
                <button onClick={handleRequestVerification}
                  disabled={requesting || (profile as any).verificationStatus === 'pending'}
                  className="w-full mt-5 py-3 rounded-[0.875rem] font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                  {(profile as any).verificationStatus === 'pending'
                    ? <><Clock className="w-4 h-4" /> Verification Requested</>
                    : requesting ? 'Requesting...' : 'Request verification'}
                </button>
              )}
            </div>

            {/* Contact links */}
            <div className="card p-6">
              <h3 className="section-title text-lg mb-4">Contact links</h3>
              {profile.contactLinks && profile.contactLinks.length > 0 ? (
                <div className="space-y-2">
                  {profile.contactLinks.map((link: any, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[color:var(--color-muted)]">
                      <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm flex-1">{link.title}</span>
                      <ExternalLink className="w-4 h-4 text-[color:var(--color-muted-foreground)]" />
                    </a>
                  ))}
                </div>
              ) : (
                <button onClick={startEditing} className="text-sm flex items-center gap-1 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">
                  No contact links. Tap to add <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}

        <button onClick={handleSignOut}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 bg-white border transition-all hover:bg-[color:var(--color-danger-soft)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}>
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </main>
      <BottomNav />
    </div>
  );
}