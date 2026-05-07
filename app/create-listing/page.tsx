'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Upload, X, AlertCircle, BadgeCheck } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['Housing', 'Events', 'Electronics', 'Clothing', 'Services', 'Other'];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;
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

export default function CreateListing() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="size-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      setFileError(`${oversized.map(f => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }
    setFiles(prev => {
      const combined = [...prev, ...incoming];
      if (combined.length > MAX_FILES) {
        setFileError(`Max ${MAX_FILES} files allowed.`);
        return prev;
      }
      return combined;
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const checkDailyLimit = async (): Promise<boolean> => {
    if (profile.isVerified) return true;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, 'products'),
      where('vendorId', '==', user!.uid),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    );
    const snap = await getDocs(q);
    return snap.size < 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!description.trim()) {
      setError('Please add a description before posting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const canPost = await checkDailyLimit();
      if (!canPost) {
        setError('Unverified accounts can only post once per day. Verify your account to post more.');
        setLoading(false);
        return;
      }

      const mediaUrls: string[] = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file, `products/${user.uid}`);
        mediaUrls.push(url);
      }

      const productData: any = {
        vendorId: user.uid,
        vendorName: profile.shopName || profile.name,
        vendorPhoto: profile.photoUrl || null,
        isVerified: profile.isVerified || false,
        vendorRole: profile.role || 'buyer',
        description: description.trim(),
        category,
        mediaUrls,
        createdAt: serverTimestamp(),
      };

      if (name.trim()) productData.name = name.trim();
      if (price) productData.price = parseFloat(price);

      await addDoc(collection(db, 'products'), productData);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 py-4 sticky top-0 z-40 backdrop-blur"
        style={{ background: 'rgba(250,250,247,0.85)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="size-10 rounded-full flex items-center justify-center hover:bg-[color:var(--color-muted)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">New Post</p>
            <h1 className="font-display text-xl">Create a listing or make a post.</h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto">

        {!profile.isVerified && (
          <div className="rounded-2xl px-4 py-3.5 mb-5 flex items-start gap-3"
            style={{ background: '#EEF2FF', color: '#3730A3' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#EAB308' }} />
            <div>
              <p className="text-sm font-semibold">You are unverified</p>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">
                Unverified accounts can only post once per day. Verify your account for higher limits and a badge on your posts.
              </p>
              <Link href="/profile" className="inline-flex items-center gap-1 text-xs font-bold mt-2 underline underline-offset-2">
                <BadgeCheck className="w-3.5 h-3.5" /> Request verification
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-5"
            style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card p-5 space-y-5">

            <div>
              <label className="label">Description <span className="font-normal text-[color:var(--color-muted-foreground)] normal-case tracking-normal">· required</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none h-32"
                placeholder="What's on your mind? If you're not uploading a photo/video or selling a product, just fill this field and post."
              />
            </div>

            <div>
              <label className="label">Product name <span className="font-normal text-[color:var(--color-muted-foreground)] normal-case tracking-normal">· optional</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="What are you selling?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Price <span className="font-normal text-[color:var(--color-muted-foreground)] normal-case tracking-normal">· optional</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] font-medium">₦</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input-field pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field bg-white">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="card p-5">
            <label className="label">
              Media <span className="font-normal text-[color:var(--color-muted-foreground)] normal-case tracking-normal">· optional, up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each</span>
            </label>

            <label className="block w-full cursor-pointer rounded-2xl border-2 border-dashed py-8 px-6 text-center transition-all hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-muted)]"
              style={{ borderColor: 'var(--color-border)' }}>
              <div className="size-12 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
                <Upload className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="font-medium text-sm mb-1">Tap to add photos or videos</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">PNG, JPG, MP4, MOV — max {MAX_FILE_SIZE_MB}MB per file</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {fileError && (
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--color-danger)' }}>{fileError}</p>
            )}

            {files.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {files.map((file, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                    {file.type.startsWith('video/') ? (
                      <video src={URL.createObjectURL(file)} className="w-full h-auto" />
                    ) : (
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-auto" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                    {file.type.startsWith('video/') && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
                        VID
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {files.length > 0 ? 'Uploading...' : 'Publishing...'}
              </span>
            ) : 'Publish'}
          </button>
        </form>
      </main>
    </div>
  );
}