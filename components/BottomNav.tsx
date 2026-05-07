'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, User, BadgeCheck, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuthStore();

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Sell', href: '/create-listing', icon: PlusSquare, primary: true },
    { name: 'Top Brands', href: '/brands', icon: BadgeCheck },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-2xl px-4 pb-3 pt-2">
        <div className="card flex items-center justify-between px-3 py-2 backdrop-blur"
             style={{ background: 'rgba(255,255,255,0.92)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            if (item.primary) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-7 size-14 rounded-full text-white shadow-lg"
                  style={{ background: 'var(--color-accent)' }}
                  aria-label={item.name}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.4} />
                </Link>
              );
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex-1 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]'
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[10px] mt-0.5 font-medium tracking-wide ${isActive ? '' : 'opacity-80'}`}>{item.name}</span>
                {isActive && <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: 'var(--color-accent)' }} />}
              </Link>
            );
          })}

          {/* Admin only */}
          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex-1 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                pathname === '/admin' ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]'
              }`}
            >
              <ShieldCheck className="w-[22px] h-[22px]" strokeWidth={pathname === '/admin' ? 2.4 : 1.8} />
              <span className="text-[10px] mt-0.5 font-medium tracking-wide opacity-80">Admin</span>
              {pathname === '/admin' && <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: 'var(--color-accent)' }} />}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}