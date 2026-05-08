'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('orders')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [resellers, setResellers] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)

  // Upload product form
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', stock: '',
    category: '', badge: '', badge_color: '', telegram_username: '', icon: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  // Referral code
  const [newCode, setNewCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')

  // Top up
  const [topupForm, setTopupForm] = useState({ reseller_id: '', amount: '' })
  const [topupMsg, setTopupMsg] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const parsed = JSON.parse(stored)
    if (parsed.role !== 'admin') { router.push('/login'); return }
    setUser(parsed)
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [p, o, r, c] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'reseller'),
      supabase.from('referral_codes').select('*').order('created_at', { ascending: false }),
    ])
    if (p.data) setProducts(p.data)
    if (o.data) setOrders(o.data)
    if (r.data) setResellers(r.data)
    if (c.data) setCodes(c.data)
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!productForm.name || !productForm.price) {
      setUploadMsg('❌ Name and price required!')
      return
    }
    setUploading(true)
    setUploadMsg('')
    let image_url = ''
    let image_size_mb = 0

    if (imageFile) {
      image_size_mb = imageFile.size / (1024 * 1024)
      const fileName = `${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile)
      if (uploadError) {
        setUploadMsg('❌ Image upload failed!')
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName)
      image_url = urlData.publicUrl
    }

    await supabase.from('products').insert({
      ...productForm,
      price: parseFloat(productForm.price),
      stock: parseInt(productForm.stock) || 0,
      image_url,
      image_size_mb,
      author_id: user.id,
      author_name: user.username,
      is_active: true,
    })

    setUploadMsg('✅ Product uploaded!')
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', badge: '', badge_color: '', telegram_username: '', icon: '' })
    setImageFile(null)
    setUploading(false)
    fetchAll()
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchAll()
  }

  const toggleProduct = async (id, current) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id)
    fetchAll()
  }

  const confirmOrder = async (id) => {
    await supabase.from('orders').update({ status: 'confirmed', confirmed_by: user.id }).eq('id', id)
    fetchAll()
  }

  const deliverOrder = async (id) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id)
    fetchAll()
  }

  const generateCode = async () => {
    if (!newCode) { setCodeMsg('❌ Enter a code!'); return }
    const { error } = await supabase.from('referral_codes').insert({
      code: newCode.toUpperCase(),
      created_by: user.id,
      bonus_amount: 1000,
    })
    if (error) { setCodeMsg('❌ Code already exists!'); return }
    setCodeMsg('✅ Code created!')
    setNewCode('')
    fetchAll()
  }

  const handleTopup = async () => {
    if (!topupForm.reseller_id || !topupForm.amount) {
      setTopupMsg('❌ Select reseller and amount!')
      return
    }
    const amt = parseFloat(topupForm.amount)
    const reseller = resellers.find(r => r.id === topupForm.reseller_id)
    await supabase.from('users').update({ balance: reseller.balance + amt }).eq('id', topupForm.reseller_id)
    await supabase.from('balance_transactions').insert({
      user_id: topupForm.reseller_id,
      amount: amt,
      type: 'topup',
      description: 'Admin top-up',
    })
    setTopupMsg(`✅ ₱${amt} added to ${reseller.username}!`)
    setTopupForm({ reseller_id: '', amount: '' })
    fetchAll()
  }

  const logout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const tabs = [
    { id: 'orders', label: '📦 Orders' },
    { id: 'products', label: '🛍️ Products' },
    { id: 'upload', label: '⬆️ Upload' },
    { id: 'resellers', label: '👥 Resellers' },
    { id: 'codes', label: '🎟️ Codes' },
    { id: 'topup', label: '💰 Top Up' },
  ]

  const statusColor = { pending: '#f59e0b', confirmed: '#3b82f6', delivered: '#10b981', cancelled: '#ef4444' }

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 24 }}>💢</span>
            <div>
              <div style={s.logoTitle}>ADMIN PANEL</div>
              <div style={s.logoSub}>ANNOYED MODDERS 0X</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={logout}>Logout</button>
        </div>

        {/* Tab Bar */}
        <div style={s.tabBar}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...s.tabBtn, ...(tab === t.id ? s.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>
      </header>

      <main style={s.main}>
        {loading && <div style={s.empty}>Loading... ⚡</div>}

        {/* ORDERS TAB */}
        {!loading && tab === 'orders' && (
          <>
            <div style={s.sectionTitle}>📦 All Orders ({orders.length})</div>
            {orders.length === 0 && <div style={s.empty}>No orders yet 😤</div>}
            {orders.map(o => (
              <div key={o.id} style={s.card}>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Product</span>
                  <span style={s.cardValue}>{o.product_name}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Buyer</span>
                  <span style={s.cardValue}>{o.buyer_name}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Contact</span>
                  <span style={s.cardValue}>{o.buyer_contact}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Total</span>
                  <span style={{ ...s.cardValue, color: '#1d4ed8', fontWeight: 700 }}>₱{o.total_price}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Status</span>
                  <span style={{ ...s.statusBadge, background: statusColor[o.status] }}>{o.status}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Date</span>
                  <span style={s.cardValue}>{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.btnRow}>
                  {o.status === 'pending' && (
                    <button style={s.actionBtn} onClick={() => confirmOrder(o.id)}>✅ Confirm</button>
                  )}
                  {o.status === 'confirmed' && (
                    <button style={{ ...s.actionBtn, background: '#10b981' }} onClick={() => deliverOrder(o.id)}>🚀 Delivered</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* PRODUCTS TAB */}
        {!loading && tab === 'products' && (
          <>
            <div style={s.sectionTitle}>🛍️ All Products ({products.length})</div>
            {products.length === 0 && <div style={s.empty}>No products yet!</div>}
            {products.map(p => (
              <div key={p.id} style={s.card}>
                {p.image_url && <img src={p.image_url} style={s.cardImg} alt={p.name} />}
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Name</span>
                  <span style={s.cardValue}>{p.name}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Price</span>
                  <span style={{ ...s.cardValue, color: '#1d4ed8', fontWeight: 700 }}>₱{p.price}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Stock</span>
                  <span style={s.cardValue}>{p.stock}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Author</span>
                  <span style={s.cardValue}>@{p.author_name}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Status</span>
                  <span style={{ ...s.statusBadge, background: p.is_active ? '#10b981' : '#94a3b8' }}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div style={s.btnRow}>
                  <button
                    style={{ ...s.actionBtn, background: p.is_active ? '#f59e0b' : '#10b981' }}
                    onClick={() => toggleProduct(p.id, p.is_active)}
                  >
                    {p.is_active ? '🙈 Hide' : '👁️ Show'}
                  </button>
                  <button
                    style={{ ...s.actionBtn, background: '#ef4444' }}
                    onClick={() => deleteProduct(p.id)}
                  >🗑️ Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* UPLOAD TAB */}
        {!loading && tab === 'upload' && (
          <>
            <div style={s.sectionTitle}>⬆️ Upload Product</div>
            <div style={s.card}>
              {uploadMsg && (
                <div style={{ ...s.msgBox, background: uploadMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderColor: uploadMsg.includes('✅') ? '#bbf7d0' : '#fecaca', color: uploadMsg.includes('✅') ? '#16a34a' : '#ef4444' }}>
                  {uploadMsg}
                </div>
              )}
              <input style={s.input} placeholder="Product Name *" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              <textarea style={s.textarea} placeholder="Description" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
              <input style={s.input} placeholder="Price (₱) *" type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
              <input style={s.input} placeholder="Stock" type="number" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
              <input style={s.input} placeholder="Category (e.g. Mods, Scripts)" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
              <input style={s.input} placeholder="Badge (e.g. HOT, NEW, SALE)" value={productForm.badge} onChange={e => setProductForm({ ...productForm, badge: e.target.value })} />
              <input style={s.input} placeholder="Badge Color (e.g. #ef4444)" value={productForm.badge_color} onChange={e => setProductForm({ ...productForm, badge_color: e.target.value })} />
              <input style={s.input} placeholder="Telegram Username (without @)" value={productForm.telegram_username} onChange={e => setProductForm({ ...productForm, telegram_username: e.target.value })} />
              <input style={s.input} placeholder="Icon Emoji (e.g. ⚡🎯)" value={productForm.icon} onChange={e => setProductForm({ ...productForm, icon: e.target.value })} />
              <div style={s.fileWrap}>
                <label style={s.fileLabel}>
                  📸 Product Image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                </label>
                {imageFile && <span style={s.fileName}>✅ {imageFile.name}</span>}
              </div>
              <button
                style={{ ...s.btn, ...(uploading ? s.btnDisabled : {}) }}
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : '⬆️ Upload Product'}
              </button>
            </div>
          </>
        )}

        {/* RESELLERS TAB */}
        {!loading && tab === 'resellers' && (
          <>
            <div style={s.sectionTitle}>👥 Resellers ({resellers.length})</div>
            {resellers.length === 0 && <div style={s.empty}>No resellers yet!</div>}
            {resellers.map(r => (
              <div key={r.id} style={s.card}>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Username</span>
                  <span style={s.cardValue}>@{r.username}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Email</span>
                  <span style={s.cardValue}>{r.email}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Telegram</span>
                  <span style={s.cardValue}>@{r.telegram_username}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Balance</span>
                  <span style={{ ...s.cardValue, color: '#1d4ed8', fontWeight: 700 }}>₱{r.balance}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Joined</span>
                  <span style={s.cardValue}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* CODES TAB */}
        {!loading && tab === 'codes' && (
          <>
            <div style={s.sectionTitle}>🎟️ Referral Codes</div>
            <div style={s.card}>
              {codeMsg && (
                <div style={{ ...s.msgBox, background: codeMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderColor: codeMsg.includes('✅') ? '#bbf7d0' : '#fecaca', color: codeMsg.includes('✅') ? '#16a34a' : '#ef4444' }}>
                  {codeMsg}
                </div>
              )}
              <input
                style={s.input}
                placeholder="New Referral Code (e.g. MOD2026)"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
              />
              <button style={s.btn} onClick={generateCode}>🎟️ Generate Code</button>
            </div>
            {codes.map(c => (
              <div key={c.id} style={s.card}>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Code</span>
                  <span style={{ ...s.cardValue, fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{c.code}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Bonus</span>
                  <span style={s.cardValue}>₱{c.bonus_amount}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Status</span>
                  <span style={{ ...s.statusBadge, background: c.is_used ? '#ef4444' : '#10b981' }}>
                    {c.is_used ? 'Used' : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* TOPUP TAB */}
        {!loading && tab === 'topup' && (
          <>
            <div style={s.sectionTitle}>💰 Add Balance to Reseller</div>
            <div style={s.card}>
              {topupMsg && (
                <div style={{ ...s.msgBox, background: topupMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderColor: topupMsg.includes('✅') ? '#bbf7d0' : '#fecaca', color: topupMsg.includes('✅') ? '#16a34a' : '#ef4444' }}>
                  {topupMsg}
                </div>
              )}
              <select
                style={s.input}
                value={topupForm.reseller_id}
                onChange={e => setTopupForm({ ...topupForm, reseller_id: e.target.value })}
              >
                <option value="">Select Reseller...</option>
                {resellers.map(r => (
                  <option key={r.id} value={r.id}>@{r.username} — ₱{r.balance}</option>
                ))}
              </select>
              <input
                style={s.input}
                placeholder="Amount to Add (₱)"
                type="number"
                value={topupForm.amount}
                onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })}
              />
              <button style={s.btn} onClick={handleTopup}>💰 Add Balance</button>
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3b82f6 !important; }
      `}</style>
    </div>
  )
}

const s = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#f0f4ff', minHeight: '100vh', maxWidth: 430, margin: '0 auto', position: 'relative' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 },
  header: { background: 'linear-gradient(135deg,#0f172a,#1e3a8a)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 24px rgba(30,58,138,0.4)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 12, color: '#fff', letterSpacing: '0.1em' },
  logoSub: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 8, color: '#60a5fa', letterSpacing: '0.2em', marginTop: 2 },
  logoutBtn: { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '6px 12px', color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Orbitron',monospace" },
  tabBar: { display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 8px 8px', gap: 6 },
  tabBtn: { flexShrink: 0, padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(96,165,250,0.2)', background: 'transparent', color: '#93c5fd', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(96,165,250,0.5)', color: '#fff' },
  main: { padding: '16px 16px 32px', position: 'relative', zIndex: 1 },
  sectionTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 14 },
  empty: { textAlign: 'center', padding: 40, color: '#64748b', fontSize: 15 },
  card: { background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid #dbeafe', boxShadow: '0 4px 16px rgba(59,130,246,0.08)', marginBottom: 12 },
  cardImg: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 12 },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardValue: { fontSize: 13, color: '#0f172a', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' },
  statusBadge: { color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, fontFamily: "'Orbitron',monospace" },
  btnRow: { display: 'flex', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, padding: '8px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  input: { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff' },
  textarea: { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff', minHeight: 80, resize: 'vertical' },
  fileWrap: { marginBottom: 12 },
  fileLabel: { display: 'inline-block', padding: '10px 16px', background: '#eff6ff', border: '1.5px dashed #bfdbfe', borderRadius: 12, fontSize: 13, color: '#3b82f6', fontWeight: 600, cursor: 'pointer' },
  fileName: { display: 'block', fontSize: 11, color: '#10b981', marginTop: 6 },
  btn: { width: '100%', padding: 13, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 4px 12px rgba(59,130,246,0.3)' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  msgBox: { border: '1px solid', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12, fontWeight: 600 },
}