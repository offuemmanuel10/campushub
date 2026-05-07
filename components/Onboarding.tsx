'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const slides = [
  {
    eyebrow: '  The marketplace for Akokites by Akokites',
    title: 'Buy,sell and connect with various Studentpreneurs',
    description: 'Campus Hub is a private marketplace for the UNILAG student community— discover goods, services and so on.',
    icon: ShoppingBag,
    accent: 'from-[#FFE8E4] to-[#FAFAF7]',
  },
  {
    eyebrow: 'Support your peers',
    title: 'Real students. Real shops. Real talent.',
    description: 'From Accomodations,to clothing,tutoring and other services. Support fellow students growing their craft.',
    icon: Store,
    accent: 'from-[#E8EEFF] to-[#FAFAF7]',
  }
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const nextStep = () => { if (step < slides.length) setStep(step + 1); };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) { setError(err.message); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { setError(err.message); }
  };

  if (step < slides.length) {
    const slide = slides[step];
    const Icon = slide.icon;
    return (
      <div className={`min-h-screen flex flex-col p-6 bg-gradient-to-b ${slide.accent}`}>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setStep(slides.length)} className="text-sm font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]">Skip</button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <div className="size-20 rounded-3xl bg-white shadow-md flex items-center justify-center mb-8">
                <Icon className="w-9 h-9" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)] mb-3">{slide.eyebrow}</p>
              <h1 className="font-display text-4xl leading-[1.1] text-[color:var(--color-foreground)] mb-4">{slide.title}</h1>
              <p className="text-[color:var(--color-muted-foreground)] text-base leading-relaxed">{slide.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="flex gap-1.5 justify-center mb-6">
            {slides.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-[color:var(--color-primary)]' : 'w-1.5 bg-[color:var(--color-border)]'}`} />
            ))}
          </div>
          <button onClick={nextStep} className="btn-primary w-full">
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-[color:var(--color-foreground)] mb-2">
            {isLogin ? 'Welcome back.' : 'Create your account.'}
          </h1>
          <p className="text-[color:var(--color-muted-foreground)]">
            {isLogin ? 'Sign in to your campus marketplace.' : 'Join the marketplace built for students.'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-5">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="student@university.edu" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-[color:var(--color-background)] text-[color:var(--color-muted-foreground)] uppercase tracking-widest">Or</span></div>
        </div>

        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2.5 rounded-[0.875rem] py-3.5 font-semibold border bg-white text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)] transition-all" style={{ borderColor: 'var(--color-border)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-[color:var(--color-muted-foreground)] mt-8">
          {isLogin ? "New to Campus Hub? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[color:var(--color-foreground)] hover:underline underline-offset-4">
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}