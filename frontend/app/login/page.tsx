'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MoonStar, SunMedium, ShieldCheck, ArrowRight, Smartphone, Lock } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth, theme, setTheme } = useStore();
  const router = useRouter();
  const isDark = theme === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(phone, password);
      setAuth(res.user, res.access_token);
      router.replace('/chat');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (p: string) => { setPhone(p); setPassword('password123'); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: `radial-gradient(circle at top, ${isDark ? 'rgba(96,165,250,0.17)' : 'rgba(37,99,235,0.12)'}, transparent 42%), var(--app-bg)` }}>
      <div className="absolute right-4 top-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`rounded-full border p-2 transition-all ${isDark ? 'border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border" style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Signal</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Private Messenger</p>
        </div>

        <div className="rounded-[24px] border p-7 shadow-[var(--shadow)]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="mb-6 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Sign In</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <Smartphone className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 001-0001" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <Lock className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-colors" style={{ backgroundColor: 'var(--accent)' }}>
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-5 text-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No account? </span>
            <Link href="/register" className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent)' }}>Register</Link>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border p-4" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['+1 (555) 001-0001', 'Alice Johnson'],
              ['+1 (555) 001-0002', 'Bob Smith'],
              ['+1 (555) 001-0003', 'Carol White'],
              ['+1 (555) 001-0004', 'David Brown'],
            ].map(([p, name]) => (
              <button key={p} onClick={() => fillDemo(p)} className="rounded-xl border px-3 py-2 text-left text-xs transition-colors" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)', color: 'var(--accent)' }}>
                <span className="mb-0.5 block font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
                <span className="block truncate" style={{ color: 'var(--text-muted)' }}>{p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
