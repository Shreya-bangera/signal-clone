'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ShieldCheck, Sparkles, MessagesSquare, Lock } from 'lucide-react';

export default function Home() {
  const { token, onboardingSeen, setOnboardingSeen, theme } = useStore();
  const router = useRouter();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (token) {
      if (!onboardingSeen) {
        setOnboardingSeen(true);
      }
      router.replace('/chat');
      return;
    }
    router.replace('/login');
  }, [token, onboardingSeen, router, setOnboardingSeen]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: `radial-gradient(circle at top, ${isDark ? 'rgba(96,165,250,0.2)' : 'rgba(37,99,235,0.12)'}, transparent 42%), var(--app-bg)` }}>
      <div className="w-full max-w-2xl rounded-[28px] border p-8 text-center shadow-[var(--shadow)]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border" style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>Welcome to Signal-inspired messaging</h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>Private conversations, polished group chats, and a refined experience from the very first screen.</p>
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
            <MessagesSquare className="mb-2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Real-time chats</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Instant messages with live typing feedback.</div>
          </div>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
            <Lock className="mb-2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Secure design</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Mock privacy controls and protected messaging UI.</div>
          </div>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
            <Sparkles className="mb-2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Polished experience</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Modern visuals that feel closer to Signal.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
