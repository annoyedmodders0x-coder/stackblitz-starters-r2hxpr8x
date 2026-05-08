'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', form.email)
      .eq('password_hash', form.password)
      .single()

    if (error || !data) {
      setError('Invalid email or password!')
      setLoading(false)
      return
    }

    localStorage.setItem('user', JSON.stringify(data))

    if (data.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/reseller')
    }

    setLoading(false)
  }

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      <div style={s.wrap}>
        <div style={s.logoWrap}>
          <span style={{ fontSize: 40 }}>💢</span>
          <div style={s.logoTitle}>ANNOYED MODDERS</div>
          <div style={s.logoSub}>0X SHOP — STAFF LOGIN</div>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Welcome Back 👋</div>
          <div style={s.cardSub}>Admin & Reseller Access Only</div>

          {error && <div style={s.error}>{error}</div>}

          <input
            style={s.input}
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            style={s.input}
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Logging in...' : '🔐 Login'}
          </button>

          <a href="/register" style={s.registerLink}>
            New Reseller? Register with Referral Code →
          </a>

          <a href="/" style={s.backLink}>
            ← Back to Shop
          </a>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #3b82f6 !important; }
      `}</style>
    </div>
  )
}

const s = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#f0f4ff', minHeight: '100vh', maxWidth: 430, margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 },
  wrap: { width: '100%', padding: '32px 24px', position: 'relative', zIndex: 1 },
  logoWrap: { textAlign: 'center', marginBottom: 28 },
  logoTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 16, color: '#0f172a', letterSpacing: '0.15em', marginTop: 10 },
  logoSub: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 9, color: '#3b82f6', letterSpacing: '0.2em', marginTop: 4 },
  card: { background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid #dbeafe', boxShadow: '0 8px 32px rgba(59,130,246,0.12)' },
  cardTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', marginBottom: 14 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 14, marginBottom: 12, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff' },
  btn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 4px 14px rgba(59,130,246,0.35)', marginBottom: 16 },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  registerLink: { display: 'block', textAlign: 'center', fontSize: 13, color: '#3b82f6', fontWeight: 600, marginBottom: 12, textDecoration: 'none' },
  backLink: { display: 'block', textAlign: 'center', fontSize: 12, color: '#94a3b8', textDecoration: 'none' },
}