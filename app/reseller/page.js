'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResellerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', stock: '',
    category: '', badge: '', badge_color: '', telegram_username: '', icon: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const [editProduct, setEditProduct] = useState(null)
  const [editMsg, setEditMsg] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const parsed = JSON.parse(stored)
    if (parsed.role !== 'reseller') { router.push('/login'); return }
    setUser(parsed)
    fetchAll(parsed)
  }, [])

  const fetchAll = async (u) => {
    setLoading(true)
    const uid = u?.id
    const [p, o, t] = await Promise.all([
      supabase.from('products').select('*').eq('author_id', uid).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('balance_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ])
    if (p.data) setProducts(p.data)
    if (o.data) setOrders(o.data)
    if (t.data) setTransactions(t.data)

    // Refresh user balance
    const { data: fresh } = await supabase.from('users').select('*').eq('id', uid).single()
    if (fresh) {
      setUser(fresh)
      localStorage.setItem('user', JSON.stringify(fresh))
    }
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!productForm.name || !productForm.price) {
      setUploadMsg('❌ Name and price required!')
      return
    }
    if (!productForm.telegram_username) {
      setUploadMsg('❌ Telegram username required!')
      return
    }

    setUploading(true)
    setUploadMsg('')

    let image_url = ''
    let image_size_mb = 0

    if (imageFile) {
      image_size_mb = parseFloat((imageFile.size / (1024 * 1024)).toFixed(4))
      const cost = Math.ceil(image_size_mb)

      if (user.balance < cost) {
        setUploadMsg(`❌ Not enough balance! Image costs ₱${cost} but you only have ₱${user.balance}. Contact admin to top up!`)
        setUploading(false)
        return
      }

      const fileName = `${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile)

      if (uploadError) {
        setUploadMsg('❌ Image upload failed!')
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName)
      image_url = urlData.publicUrl

      // Deduct balance
      const newBalance = user.balance - cost
      await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: -cost,
        type: 'deduction',
        description: `Image upload: ${imageFile.name} (${image_size_mb.toFixed(2)} MB)`,
      })
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

    setUploadMsg('✅ Product uploaded successfully!')
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', badge: '', badge_color: '', telegram_username: '', icon: '' })
    setImageFile(null)
    setUploading(false)
    fetchAll(user)
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchAll(user)
  }

  const openEdit = (p) => {
    setEditProduct({ ...p })
    setTab('edit')
  }

  const handleRestock = async () => {
    if (!editProduct) return
    await supabase.from('products').update({
      name: editProduct.name,
      description: editProduct.description,
      price: parseFloat(editProduct.price),
      stock: parseInt(editProduct.stock),
      category: editProduct.category,
      badge: editProduct.badge,
      badge_color: editProduct.badge_color,
      telegram_username: editProduct.telegram_username,
      icon: editProduct.icon,
    }).eq('id', editProduct.id)
    setEditMsg('✅ Product updated!')
    fetchAll(user)
  }

  const confirmOrder = async (id) => {
    await supabase.from('orders').update({ status: 'confirmed', confirmed_by: user.id }).eq('id', id)
    fetchAll(user)
  }

  const logout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Filter orders for this reseller's products
  const myProductIds = products.map(p => p.id)
  const myOrders = orders.filter(o => myProductIds.includes(o.product_id))

  const statusColor = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  }

  const tabs = [
    { id: 'products', label: '🛍️ My Products' },
    { id: 'upload', label: '⬆️ Upload' },
    { id: 'orders', label: '📦 Orders' },
    { id: 'balance', label: '💰 Balance' },
  ]

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 22 }}>🏪</span>
            <div>
              <div style={s.logoTitle}>RESELLER PANEL</div>
              <div style={s.logoSub}>@{user?.username}</div>
            </div>
          </div>
          <div style={s.headerRight}>
            <div style={s.balancePill}>💰 ₱{user?.balance || 0}</div>
            <button style={s.logoutBtn} onClick={logout}>Out</button>
          </div>
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

        {/* MY PRODUCTS */}
        {!loading && tab === 'products' && (
          <>
            <div style={s.sectionTitle}>🛍️ My Products ({products.length})</div>
            {products.length === 0 && (
              <div style={s.emptyCard}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div style={s.emptyTitle}>No products yet!</div>
                <div style={s.emptySub}>Go to Upload tab to add your first product</div>
                <button style={s.btn} onClick={() => setTab('upload')}>⬆️ Upload Now</button>
              </div>
            )}
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
                  <span style={{ ...s.cardValue, color: p.stock <= 5 ? '#ef4444' : '#0f172a' }}>
                    {p.stock <= 0 ? '❌ Out of Stock' : p.stock <= 5 ? `⚠️ ${p.stock} left` : p.stock}
                  </span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Status</span>
                  <span style={{ ...s.statusBadge, background: p.is_active ? '#10b981' : '#94a3b8' }}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div style={s.btnRow}>
                  <button style={s.actionBtn} onClick={() => openEdit(p)}>✏️ Edit</button>
                  <button style={{ ...s.actionBtn, background: '#ef4444' }} onClick={() => deleteProduct(p.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* UPLOAD */}
        {!loading && tab === 'upload' && (
          <>
            <div style={s.sectionTitle}>⬆️ Upload Product</div>

            {/* Balance Warning */}
            {user?.balance <= 10 && (
              <div style={s.warningBox}>
                ⚠️ Low balance! ₱{user?.balance} remaining. Contact admin to top up via Telegram.
              </div>
            )}

            <div style={s.infoBox}>
              📌 Image upload cost: <strong>₱1 per MB</strong>. Your balance: <strong>₱{user?.balance}</strong>
            </div>

            <div style={s.card}>
              {uploadMsg && (
                <div style={{ ...s.msgBox, background: uploadMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderColor: uploadMsg.includes('✅') ? '#bbf7d0' : '#fecaca', color: uploadMsg.includes('✅') ? '#16a34a' : '#ef4444' }}>
                  {uploadMsg}
                </div>
              )}
              <input style={s.input} placeholder="Product Name *" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              <textarea style={s.textarea} placeholder="Description" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
              <input style={s.input} placeholder="Price (₱) *" type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
              <input style={s.input} placeholder="Stock quantity" type="number" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
              <input style={s.input} placeholder="Category (e.g. Mods, Scripts)" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
              <input style={s.input} placeholder="Badge (e.g. HOT, NEW)" value={productForm.badge} onChange={e => setProductForm({ ...productForm, badge: e.target.value })} />
              <input style={s.input} placeholder="Badge Color (e.g. #ef4444)" value={productForm.badge_color} onChange={e => setProductForm({ ...productForm, badge_color: e.target.value })} />
              <input style={s.input} placeholder="Your Telegram (without @) *" value={productForm.telegram_username} onChange={e => setProductForm({ ...productForm, telegram_username: e.target.value })} />
              <input style={s.input} placeholder="Icon Emoji (e.g. ⚡🎯)" value={productForm.icon} onChange={e => setProductForm({ ...productForm, icon: e.target.value })} />

              <div style={s.fileWrap}>
                <label style={s.fileLabel}>
                  📸 Upload Image (₱1/MB)
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const f = e.target.files[0]
                    if (f) {
                      setImageFile(f)
                      const mb = (f.size / (1024 * 1024)).toFixed(2)
                      setUploadMsg(`📊 Image size: ${mb} MB = ₱${Math.ceil(mb)} will be deducted`)
                    }
                  }} />
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

        {/* EDIT PRODUCT */}
        {!loading && tab === 'edit' && editProduct && (
          <>
            <div style={s.sectionTitle}>✏️ Edit Product</div>
            <div style={s.card}>
              {editMsg && (
                <div style={{ ...s.msgBox, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                  {editMsg}
                </div>
              )}
              <input style={s.input} placeholder="Product Name" value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
              <textarea style={s.textarea} placeholder="Description" value={editProduct.description || ''} onChange={e => setEditProduct({ ...editProduct, description: e.target.value })} />
              <input style={s.input} placeholder="Price (₱)" type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: e.target.value })} />
              <input style={s.input} placeholder="Stock" type="number" value={editProduct.stock} onChange={e => setEditProduct({ ...editProduct, stock: e.target.value })} />
              <input style={s.input} placeholder="Category" value={editProduct.category || ''} onChange={e => setEditProduct({ ...editProduct, category: e.target.value })} />
              <input style={s.input} placeholder="Badge" value={editProduct.badge || ''} onChange={e => setEditProduct({ ...editProduct, badge: e.target.value })} />
              <input style={s.input} placeholder="Badge Color" value={editProduct.badge_color || ''} onChange={e => setEditProduct({ ...editProduct, badge_color: e.target.value })} />
              <input style={s.input} placeholder="Telegram Username" value={editProduct.telegram_username || ''} onChange={e => setEditProduct({ ...editProduct, telegram_username: e.target.value })} />
              <input style={s.input} placeholder="Icon Emoji" value={editProduct.icon || ''} onChange={e => setEditProduct({ ...editProduct, icon: e.target.value })} />
              <button style={s.btn} onClick={handleRestock}>💾 Save Changes</button>
              <button style={{ ...s.btn, background: '#f1f5f9', color: '#64748b', boxShadow: 'none', marginTop: 8 }} onClick={() => setTab('products')}>← Back</button>
            </div>
          </>
        )}

        {/* ORDERS */}
        {!loading && tab === 'orders' && (
          <>
            <div style={s.sectionTitle}>📦 My Orders ({myOrders.length})</div>
            {myOrders.length === 0 && <div style={s.empty}>No orders yet 😤</div>}
            {myOrders.map(o => (
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
                {o.status === 'pending' && (
                  <button style={s.actionBtn} onClick={() => confirmOrder(o.id)}>✅ Confirm Order</button>
                )}
              </div>
            ))}
          </>
        )}

        {/* BALANCE */}
        {!loading && tab === 'balance' && (
          <>
            <div style={s.sectionTitle}>💰 Balance & Transactions</div>

            <div style={s.balanceCard}>
              <div style={s.balanceLabel}>Current Balance</div>
              <div style={s.balanceAmount}>₱{user?.balance || 0}</div>
              <div style={s.balanceSub}>1 MB image = ₱1 deducted on upload</div>
            </div>

            <div style={s.infoBox}>
              📌 Need more balance? Message admin on Telegram to top up!
            </div>

            <div style={s.sectionTitle}>Transaction History</div>
            {transactions.length === 0 && <div style={s.empty}>No transactions yet</div>}
            {transactions.map(t => (
              <div key={t.id} style={s.card}>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Type</span>
                  <span style={{ ...s.statusBadge, background: t.type === 'topup' ? '#10b981' : '#ef4444' }}>
                    {t.type === 'topup' ? '⬆️ Top Up' : '⬇️ Deduction'}
                  </span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Amount</span>
                  <span style={{ ...s.cardValue, color: t.type === 'topup' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {t.type === 'topup' ? '+' : ''}₱{Math.abs(t.amount)}
                  </span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Note</span>
                  <span style={{ ...s.cardValue, fontSize: 11 }}>{t.description}</span>
                </div>
                <div style={s.cardRow}>
                  <span style={s.cardLabel}>Date</span>
                  <span style={s.cardValue}>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus { outline: none; border-color: #3b82f6 !important; }
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
  logoSub: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 9, color: '#60a5fa', letterSpacing: '0.1em', marginTop: 2 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  balancePill: { background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 10, padding: '5px 10px', color: '#93c5fd', fontSize: 11, fontWeight: 700, fontFamily: "'Orbitron',monospace" },
  logoutBtn: { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '5px 10px', color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  tabBar: { display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 8px 8px', gap: 6 },
  tabBtn: { flexShrink: 0, padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(96,165,250,0.2)', background: 'transparent', color: '#93c5fd', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(96,165,250,0.5)', color: '#fff' },
  main: { padding: '16px 16px 32px', position: 'relative', zIndex: 1 },
  sectionTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 14 },
  empty: { textAlign: 'center', padding: 40, color: '#64748b', fontSize: 15 },
  emptyCard: { background: '#fff', borderRadius: 16, padding: 28, border: '1.5px solid #dbeafe', textAlign: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  card: { background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid #dbeafe', boxShadow: '0 4px 16px rgba(59,130,246,0.08)', marginBottom: 12 },
  cardImg: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 12 },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardValue: { fontSize: 13, color: '#0f172a', fontWeight: 500, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' },
  statusBadge: { color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, fontFamily: "'Orbitron',monospace" },
  btnRow: { display: 'flex', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, padding: '8px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: 8 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff' },
  textarea: { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 13, marginBottom: 10, fontFamily: "'DM Sans',sans-serif", color: '#0f172a', background: '#f8faff', minHeight: 80, resize: 'vertical' },
  fileWrap: { marginBottom: 12 },
  fileLabel: { display: 'inline-block', padding: '10px 16px', background: '#eff6ff', border: '1.5px dashed #bfdbfe', borderRadius: 12, fontSize: 13, color: '#3b82f6', fontWeight: 600, cursor: 'pointer' },
  fileName: { display: 'block', fontSize: 11, color: '#10b981', marginTop: 6 },
  btn: { width: '100%', padding: 13, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 4px 12px rgba(59,130,246,0.3)' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  msgBox: { border: '1px solid', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12, fontWeight: 600 },
  warningBox: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#ea580c', fontWeight: 600, marginBottom: 12 },
  infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#3b82f6', marginBottom: 14 },
  balanceCard: { background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 14, boxShadow: '0 8px 24px rgba(30,58,138,0.3)' },
  balanceLabel: { fontFamily: "'Orbitron',monospace", fontSize: 10, color: '#93c5fd', letterSpacing: '0.15em', marginBottom: 8 },
  balanceAmount: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 36, color: '#fff', marginBottom: 6 },
  balanceSub: { fontSize: 11, color: '#93c5fd' },
}
