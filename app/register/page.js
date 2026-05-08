'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    referral_code: '',
    username: '',
    email: '',
    password: '',
    telegram_username: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeValid, setCodeValid] = useState(null)
  const [bonusAmount, setBonusAmount] = useState(1000)

  const verifyCode = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', form.referral_code.toUpperCase())
      .eq('is_used', false)
      .single()

    if (error || !data) {
      setError('Invalid or already used referral code!')
      setCodeValid(false)
      setLoading(false)
      return
    }

    setCodeValid(true)
    setBonusAmount(data.bonus_amount)
    setStep(2)
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    if (!form.username || !form.email || !form.password || !form.telegram_username) {
      setError('Please fill in all fields!')
      setLoading(false)
      return
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', form.email)
      .single()

    if (existing) {
      setError('Email already registered!')
      setLoading(false)
      return
    }

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: form.email,
        password_hash: form.password,
        role: 'reseller',
        username: form.username,
        telegram_username: form.telegram_username,
        balance: bonusAmount,
        referred_by: form.referral_code.toUpperCase(),
      })
      .select()
      .single()

    if (userError) {
      setError('Registration failed! Try again.')
      setLoading(false)
      return
    }

    // Mark referral code as used
    await supabase
      .from('referral_codes')
      .update({ is_used: true, used_by: newUser.id })
      .eq('code', form.referral_code.toUpperCase())

    // Log balance transaction
    await supabase.from('balance_transactions').insert({
      user_id: newUser.id,
      amount: bonusAmount,
      type: 'topup',
      description: 'Welcome bonus from referral code',
    })

    setStep(3)
    setLoading(false)
  }

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      <div style={s.wrap}>
        <div style={s.logoWrap}>
          <span style={{ fontSize: 40 }}>💢</span>
          <div style={s.logoTitle}>ANNOYED MODDERS</div>
          <div style={s.logoSub}>RESELLER REGISTRATION</div>
        </div>

        {/* Step indicators */}
        <div style={s.steps}>
          {[1, 2, 3].map(n => (
            <div key={n} style={s.stepWrap}>
              <div style={{ ...s.stepDot, ...(step >= n ? s.stepActive : {}) }}>
                {step > n ? '✓' : n}
              </div>
              {n < 3 && <div style={{ ...s.stepLine, ...(step > n ? s.stepLineActive : {}) }} />}
            </div>
          ))}
        </div>

        <div style={s.card}>

          {/* STEP 1 — Referral Code */}
          {step === 1 && (
            <>
              <div style={s.cardTitle}>🎟️ Enter Referral Code</div>
              <div style={s.cardSub}>Ask admin for your referral code to register</div>

              {error && <div style={s.error}>{error}</div>}

              <input
                style={s.input}
                placeholder="REFERRAL CODE (e.g. MOD2026)"
                value={form.referral_code}
                onChange={e => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
              />

              <button
                style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
                onClick={verifyCode}
                disabled={loading}
              >
                {loading ? 'Verifying...' : '🔍 Verify Code'}
              </button>
            </>
          )}

          {/* STEP 2 — Account Details */}
          {step === 2 && (
            <>
              <div style={s.cardTitle}>📝 Create Account</div>
              <div style={s.successBanner}>
                ✅ Valid code! You'll get ₱{bonusAmount} welcome bonus!
              </div>

              {error && <div style={s.error}>{error}</div>}

              <input
                style={s.input}
                placeholder="Username (shop display name)"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
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
              <input
                style={s.input}
                placeholder="Telegram Username (without @)"
                value={form.telegram_username}
                onChange={e => setForm({ ...form, telegram_username: e.target.value })}
              />

              <div style={s.noteBox}>
                📌 Your Telegram username will be shown to buyers for direct contact
              </div>

              <button
                style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Registering...' : '🚀 Create Account'}
              </button>

              <button style={s.backBtn} onClick={() => { setStep(1); setError('') }}>
                ← Back
              </button>
            </>
          )}

          {/* STEP 3 — Success */}
          {step === 3 && (
            <div style={s.successWrap}>
              <div style={s.successIcon}>🎉</div>
              <div style={s.successTitle}>Welcome to the Team!</div>
              <div style={s.successSub}>
                Your account is ready. You received ₱{bonusAmount} balance!
              </div>
              <div style={s.balanceBadge}>
                💰 ₱{bonusAmount} Balance Added
              </div>
              <button style={s.btn} onClick={() => router.push('/login')}>
                🔐 Go to Login
              </button>
            </div>
          )}

          {step < 3 && (
            <a href="/login" style={s.backLink}>
              Already have an account? Login →
            </a>
          )}
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
  root: { fontFamily: "'DM Sans',sans-serif", background: '#f0f4ff', minHeight: '100vh', maxWidth: 430, margin: '0 auto', position: 'relative' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 },
  wrap: { padding: '40px 24px 32px', position: 'relative', zIndex: 1 },
  logoWrap: { textAlign: 'center', marginBottom: 24 },
  logoTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 15, color: '#0f172a', letterSpacing: '0.15em', marginTop: 10 },
  logoSub: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 9, color: '#3b82f6', letterSpacing: '0.2em', marginTop: 4 },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepWrap: { display: 'flex', alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron',monospace" },
  stepActive: { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' },
  stepLine: { width: 40, height: 2, background: '#e2e8f0', margin: '0 4px' },
  stepLineActive: { background: '#3b82f6' },
  card: { background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid #dbeafe', boxShadow: '0 8px 32px rgba(59,130,246,0.12)' },
  cardTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 },
  cardSub: { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', marginBottom: 14 },
  successBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#16a34a', marginBottom: 16, fontWeight: 600 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 14, marginBottom: 12, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff' },
  noteBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#3b82f6', marginBottom: 16 },
  btn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 4px 14px rgba(59,130,246,0.35)', marginBottom: 12 },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  backBtn: { width: '100%', padding: 12, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginBottom: 12 },
  backLink: { display: 'block', textAlign: 'center', fontSize: 12, color: '#3b82f6', textDecoration: 'none', marginTop: 4 },
  successWrap: { textAlign: 'center', padding: '16px 0' },
  successIcon: { fontSize: 52, marginBottom: 12 },
  successTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 },
  successSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  balanceBadge: { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 700, display: 'inline-block', marginBottom: 20, fontFamily: "'Orbitron',monospace" },
}