'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Shop() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [categories, setCategories] = useState(['All'])
  const [orderModal, setOrderModal] = useState(null)
  const [form, setForm] = useState({ name: '', contact: '' })
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setProducts(data)
      const cats = ['All', ...new Set(data.map(p => p.category).filter(Boolean))]
      setCategories(cats)
    }
    setLoading(false)
  }

  const filtered = products.filter(p => {
    const matchCat = category === 'All' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleOrder = async (product) => {
    if (!form.name || !form.contact) return alert('Fill in your name and contact!')

    await supabase.from('orders').insert({
      product_id: product.id,
      product_name: product.name,
      buyer_name: form.name,
      buyer_contact: form.contact,
      quantity: 1,
      total_price: product.price,
      status: 'pending'
    })

    setSubmitted(true)
    setTimeout(() => {
      window.open(`https://t.me/${product.telegram_username}`, '_blank')
      setOrderModal(null)
      setSubmitted(false)
      setForm({ name: '', contact: '' })
    }, 1500)
  }

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 28 }}>💢</span>
            <div>
              <div style={s.logoTitle}>ANNOYED MODDERS</div>
              <div style={s.logoSub}>0X SHOP</div>
            </div>
          </div>
          <a href="/login" style={s.loginBtn}>Login</a>
        </div>
        <div style={s.ticker}>
          <div style={s.tickerInner}>
            🔥 EXCLUSIVE MODS &nbsp;•&nbsp; ⚡ INSTANT DELIVERY &nbsp;•&nbsp; 🛡️ UNDETECTED &nbsp;•&nbsp; 💰 BEST PRICE &nbsp;&nbsp;
            🔥 EXCLUSIVE MODS &nbsp;•&nbsp; ⚡ INSTANT DELIVERY &nbsp;•&nbsp; 🛡️ UNDETECTED &nbsp;•&nbsp; 💰 BEST PRICE &nbsp;&nbsp;
          </div>
        </div>
      </header>

      {/* Search */}
      <div style={s.searchWrap}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div style={s.catScroll}>
        {categories.map(c => (
          <button
            key={c}
            style={{ ...s.catBtn, ...(category === c ? s.catActive : {}) }}
            onClick={() => setCategory(c)}
          >{c}</button>
        ))}
      </div>

      {/* Products */}
      <main style={s.main}>
        {loading && <div style={s.empty}>Loading... ⚡</div>}
        {!loading && filtered.length === 0 && (
          <div style={s.empty}>No products found 😤</div>
        )}
        {filtered.map(p => (
          <div key={p.id} style={s.card}>
            {p.badge && (
              <span style={{ ...s.badge, background: p.badge_color || '#3b82f6' }}>
                {p.badge}
              </span>
            )}
            {p.image_url && (
              <img src={p.image_url} alt={p.name} style={s.cardImg} />
            )}
            <div style={s.cardTop}>
              <div style={s.cardIcon}>{p.icon || '📦'}</div>
              <div>
                <div style={s.cardCat}>{p.category}</div>
                <div style={s.cardName}>{p.name}</div>
                <div style={s.cardAuthor}>by @{p.author_name || 'Admin'}</div>
              </div>
            </div>
            <p style={s.cardDesc}>{p.description}</p>
            <div style={s.cardStock}>
              <span style={{
                ...s.stockDot,
                background: p.stock <= 5 ? '#ef4444' : '#10b981'
              }} />
              {p.stock <= 0 ? 'Out of Stock' : p.stock <= 5 ? `Only ${p.stock} left!` : 'In Stock'}
            </div>
            <div style={s.cardBottom}>
              <span style={s.price}>₱{p.price}</span>
              <button
                style={{ ...s.buyBtn, ...(p.stock <= 0 ? s.buyDisabled : {}) }}
                disabled={p.stock <= 0}
                onClick={() => setOrderModal(p)}
              >
                🛒 Buy
              </button>
            </div>
          </div>
        ))}
      </main>

      <footer style={s.footer}>
        <div style={s.footerLogo}>💢 ANNOYED MODDERS 0X</div>
        <div style={s.footerNote}>© 2026 All rights reserved.</div>
      </footer>

      {/* Order Modal */}
      {orderModal && (
        <div style={s.overlay} onClick={() => setOrderModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div style={s.successWrap}>
                <div style={s.successIcon}>✅</div>
                <div style={s.successText}>Order placed!</div>
                <div style={s.successSub}>Redirecting to Telegram...</div>
              </div>
            ) : (
              <>
                <div style={s.modalTitle}>🛒 Buy — {orderModal.name}</div>
                <div style={s.modalPrice}>₱{orderModal.price}</div>
                <input
                  style={s.input}
                  placeholder="Your Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <input
                  style={s.input}
                  placeholder="Contact (GCash / TG)"
                  value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                />
                <div style={s.modalNote}>
                  📌 After order, you'll be redirected to seller's Telegram
                </div>
                <button style={s.confirmBtn} onClick={() => handleOrder(orderModal)}>
                  Confirm & Go to Telegram
                </button>
                <button style={s.cancelBtn} onClick={() => setOrderModal(null)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input:focus { outline: none; border-color: #3b82f6 !important; }
      `}</style>
    </div>
  )
}

const s = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#f0f4ff', minHeight: '100vh', maxWidth: 430, margin: '0 auto', position: 'relative', overflowX: 'hidden' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 },
  header: { background: 'linear-gradient(135deg,#0f172a,#1e3a8a)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 24px rgba(30,58,138,0.4)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 13, color: '#fff', letterSpacing: '0.15em' },
  logoSub: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 10, color: '#60a5fa', letterSpacing: '0.3em', marginTop: 2 },
  loginBtn: { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 10, padding: '7px 14px', color: '#93c5fd', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: "'Orbitron',monospace" },
  ticker: { background: 'rgba(59,130,246,0.15)', overflow: 'hidden', whiteSpace: 'nowrap', borderTop: '1px solid rgba(96,165,250,0.2)', padding: '5px 0' },
  tickerInner: { display: 'inline-block', animation: 'ticker 18s linear infinite', fontSize: 11, color: '#93c5fd', fontWeight: 600 },
  searchWrap: { margin: '14px 16px 0', position: 'relative', zIndex: 1 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 },
  searchInput: { width: '100%', padding: '11px 14px 11px 36px', borderRadius: 14, border: '1.5px solid #bfdbfe', background: '#fff', fontSize: 14, color: '#1e3a8a', fontFamily: "'DM Sans',sans-serif" },
  catScroll: { display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', scrollbarWidth: 'none', zIndex: 1, position: 'relative' },
  catBtn: { flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: '1.5px solid #bfdbfe', background: '#fff', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  catActive: { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', border: '1.5px solid #3b82f6', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' },
  main: { padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 },
  empty: { textAlign: 'center', padding: 40, color: '#64748b', fontSize: 16 },
  card: { background: '#fff', borderRadius: 18, padding: 16, border: '1.5px solid #dbeafe', boxShadow: '0 4px 16px rgba(59,130,246,0.08)', position: 'relative', animation: 'fadeIn 0.3s ease' },
  badge: { position: 'absolute', top: 12, right: 12, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 8, fontFamily: "'Orbitron',monospace" },
  cardImg: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 12 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardIcon: { fontSize: 30, background: '#eff6ff', borderRadius: 12, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #bfdbfe' },
  cardCat: { fontSize: 10, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase' },
  cardName: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.3 },
  cardAuthor: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  cardDesc: { fontSize: 12.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 },
  cardStock: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748b', fontWeight: 600, marginBottom: 12 },
  stockDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 17, color: '#1d4ed8' },
  buyBtn: { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' },
  buyDisabled: { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none', cursor: 'not-allowed' },
  footer: { background: 'linear-gradient(135deg,#0f172a,#1e3a8a)', padding: '24px 16px', textAlign: 'center', zIndex: 1, position: 'relative' },
  footerLogo: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 14, color: '#fff', letterSpacing: '0.15em', marginBottom: 6 },
  footerNote: { color: '#475569', fontSize: 11 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end' },
  modal: { background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: 24, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 },
  modalPrice: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 20, color: '#1d4ed8', marginBottom: 16 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 14, marginBottom: 12, fontFamily: "'DM Sans',sans-serif", color: '#0f172a' },
  modalNote: { fontSize: 12, color: '#64748b', background: '#f0f4ff', borderRadius: 10, padding: '10px 12px', marginBottom: 14 },
  confirmBtn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, fontFamily: "'DM Sans',sans-serif" },
  cancelBtn: { width: '100%', padding: 12, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  successWrap: { textAlign: 'center', padding: '32px 0' },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successText: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 },
  successSub: { fontSize: 13, color: '#64748b' },
}