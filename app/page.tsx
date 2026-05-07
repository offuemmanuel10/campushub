'use client';

import { useAuthStore } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import { ProfileSetup } from '@/components/ProfileSetup';
import { Marketplace } from '@/components/Marketplace';
import { BottomNav } from '@/components/BottomNav';

export default function Home() {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-muted)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!user) return <Onboarding />;
  if (!profile) return <ProfileSetup />;

  return (
    <>
      <Marketplace />
      <BottomNav />
    </>
  );
}
