'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';
import { MoonStar, SunMedium, ShieldCheck, ArrowRight, Smartphone, Lock, UserRound } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, theme, setTheme } = useStore();
  const [form, setForm] = useState({
    phone: '',
    display_name: '',
    username: '',
    password: '',
    otp: '123456',
  });
  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.register({
        phone: form.phone,
        display_name: form.display_name,
        username: form.username || undefined,
        password: form.password,
        otp: form.otp,
      });
      setAuth(res.user, res.access_token);
      router.replace('/chat');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: `radial-gradient(circle at top, ${isDark ? 'rgba(96,165,250,0.17)' : 'rgba(37,99,235,0.12)'}, transparent 42%), var(--app-bg)` }}>
      <div className="absolute right-4 top-4">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`rounded-full border p-2 transition-all ${isDark ? 'border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`} aria-label="Toggle theme">
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border" style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create account</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Secure messaging, beautifully simple</p>
        </div>

        <div className="rounded-[24px] border p-7 shadow-[var(--shadow)]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="mb-6 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Register</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <Smartphone className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 001-0007" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <UserRound className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Your name" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Username (optional)</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <UserRound className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="flex items-center rounded-2xl border px-3 py-2" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)' }}>
                <Lock className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>OTP</label>
              <input type="text" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={{ backgroundColor: isDark ? 'var(--surface-muted)' : '#f8fafc', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Use 123456 for the mocked verification flow.</p>
            </div>
            <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-colors" style={{ backgroundColor: 'var(--accent)' }}>
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-5 text-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
            <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
