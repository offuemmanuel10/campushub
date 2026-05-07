import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'buyer' | 'vendor' | 'admin';
  name: string;
  photoUrl?: string;
  bio?: string;
  shopName?: string;
  shopDescription?: string;
  isVerified: boolean;
  createdAt: any;
  catalogUrl?: string;
  contactLinks?: { title: string; url: string }[];
  specialServices?: string;
  catalogItems?: any[];
  verificationStatus?: string;
  verificationRequestedAt?: any;
  verifiedAt?: any;
  verificationExpiresAt?: any;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
