import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ─── Styles ────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Inter', sans-serif" },
  sidebar: {
    width: '240px', background: '#16659c', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0
  },
  sidebarLogo: {
    padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  sidebarItem: (active) => ({
    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
    cursor: 'pointer', color: active ? 'white' : 'rgba(255,255,255,0.7)',
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderLeft: active ? '3px solid white' : '3px solid transparent',
    fontSize: '14px', fontWeight: active ? 600 : 400, transition: 'all 0.15s'
  }),
  card: {
    background: 'white', borderRadius: '16px', padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
  },
  btn: (variant = 'primary') => ({
    padding: '10px 20px', borderRadius: '10px', border: 'none',
    fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '13px',
    cursor: 'pointer',
    background: variant === 'primary' ? '#16659c' : variant === 'danger' ? '#e53e3e' : '#f7fafc',
    color: variant === 'ghost' ? '#4a5568' : 'white',
    border: variant === 'ghost' ? '1.5px solid #e2e8f0' : 'none'
  }),
  input: {
    padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%'
  },
  badge: (color) => ({
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    background: color === 'green' ? '#c6f6d5' : color === 'blue' ? '#bee3f8' :
                color === 'red' ? '#fed7d7' : '#e2e8f0',
    color: color === 'green' ? '#276749' : color === 'blue' ? '#2b6cb0' :
           color === 'red' ? '#c53030' : '#4a5568'
  })
};

// ─── Auth ──────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@paysyslabs.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      if (data.role !== 'admin') throw new Error('Admin access required');
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(data));
      onLogin(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#e8f2fa,#f0f7ff)' }}>
      <div style={{ ...S.card, width: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏦</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a202c' }}>Paysys Labs</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>Admin Panel</div>
        </div>
        {error && <div style={{ background:'#fff5f5', border:'1px solid #feb2b2', borderRadius:'8px', padding:'10px', marginBottom:'16px', fontSize:'13px', color:'#c53030' }}>{error}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <input style={S.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={S.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button style={{ ...S.btn('primary'), padding:'12px' }} onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Knowledge Base ────────────────────────────────────────────────────────
function KnowledgeBase({ token }) {
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState({});
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const load = async () => {
    const [s, st] = await Promise.all([
      fetch(`${API}/api/knowledge/sources?token=${token}`).then(r => r.json()),
      fetch(`${API}/api/knowledge/stats?token=${token}`).then(r => r.json())
    ]);
    setSources(Array.isArray(s) ? s : []);
    setStats(st);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const addUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/knowledge/add-url?url=${encodeURIComponent(url)}&token=${token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      showMsg(`✅ "${data.title}" added and processing`);
      setUrl('');
      setTimeout(load, 2000);
    } catch (e) { showMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('token', token);
    try {
      const res = await fetch(`${API}/api/knowledge/upload-file`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      showMsg(`✅ "${file.name}" uploaded and processing`);
      setTimeout(load, 2000);
    } catch (e) { showMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const deleteSource = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await fetch(`${API}/api/knowledge/sources/${id}?token=${token}`, { method: 'DELETE' });
    showMsg('🗑️ Source deleted');
    load();
  };

  const typeIcon = { pdf: '📄', url: '🌐', docx: '📝', txt: '📃' };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c', margin: 0 }}>Knowledge Base</h2>
        <p style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>Manage the content your chatbot answers from</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Active Sources', value: stats.active_sources || 0, icon: '📚', color: '#bee3f8' },
          { label: 'Total Chunks', value: stats.total_chunks || 0, icon: '🧩', color: '#c6f6d5' }
        ].map(s => (
          <div key={s.label} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px', background: s.color, borderRadius: '12px', padding: '10px' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#276749' }}>{msg}</div>}

      {/* Add Content */}
      <div style={{ ...S.card, marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Add Content</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Enter URL (e.g. https://paysyslabs.com/products/open-connect/)" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()} />
          <button style={S.btn('primary')} onClick={addUrl} disabled={loading || !url.trim()}>
            {loading ? '...' : 'Add URL'}
          </button>
        </div>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); uploadFile(e.dataTransfer.files[0]); }}
          style={{
            border: '2px dashed #bee3f8', borderRadius: '12px', padding: '28px',
            textAlign: 'center', cursor: 'pointer', background: '#f7fbff',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e8f2fa'}
          onMouseLeave={e => e.currentTarget.style.background = '#f7fbff'}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#16659c' }}>Drop files here or click to upload</div>
          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>PDF, DOCX, TXT supported</div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0])} />
        </div>
      </div>

      {/* Sources List */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Content Sources ({sources.length})</h3>
        {sources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#a0aec0', fontSize: '14px' }}>
            No content added yet. Add URLs or upload files above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f7fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '20px' }}>{typeIcon[s.source_type] || '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#a0aec0' }}>{s.chunk_count} chunks · {s.source_type.toUpperCase()}</div>
                </div>
                <span style={S.badge(s.status === 'active' ? 'green' : s.status === 'processing' ? 'blue' : 'red')}>
                  {s.status}
                </span>
                <button onClick={() => deleteSource(s.id, s.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#e53e3e' }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bot Overrides ─────────────────────────────────────────────────────────
function BotOverrides({ token }) {
  const [overrides, setOverrides] = useState([]);
  const [form, setForm] = useState({ trigger_phrase: '', response: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => fetch(`${API}/api/knowledge/overrides?token=${token}`).then(r => r.json()).then(d => setOverrides(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const save = async () => {
    if (!form.trigger_phrase || !form.response) return;
    const url = editing ? `${API}/api/knowledge/overrides/${editing}?token=${token}` : `${API}/api/knowledge/overrides?token=${token}`;
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    showMsg(editing ? '✅ Override updated' : '✅ Override created');
    setForm({ trigger_phrase: '', response: '' });
    setEditing(null);
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this override?')) return;
    await fetch(`${API}/api/knowledge/overrides/${id}?token=${token}`, { method: 'DELETE' });
    showMsg('🗑️ Deleted');
    load();
  };

  const edit = (o) => { setEditing(o.id); setForm({ trigger_phrase: o.trigger_phrase, response: o.response }); };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c', margin: 0 }}>Bot Response Overrides</h2>
        <p style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>Define exact responses for specific questions — overrides take priority over AI</p>
      </div>

      {msg && <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#276749' }}>{msg}</div>}

      <div style={{ ...S.card, marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>{editing ? '✏️ Edit Override' : '+ New Override'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>TRIGGER PHRASE (question to match)</label>
            <input style={S.input} placeholder='e.g. "what is your pricing" or "contact sales"' value={form.trigger_phrase} onChange={e => setForm({ ...form, trigger_phrase: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>EXACT RESPONSE</label>
            <textarea style={{ ...S.input, minHeight: '100px', resize: 'vertical' }} placeholder="The exact response the bot will give..." value={form.response} onChange={e => setForm({ ...form, response: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn('primary')} onClick={save}>{editing ? 'Update' : 'Create Override'}</button>
            {editing && <button style={S.btn('ghost')} onClick={() => { setEditing(null); setForm({ trigger_phrase: '', response: '' }); }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Active Overrides ({overrides.length})</h3>
        {overrides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#a0aec0', fontSize: '14px' }}>No overrides yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overrides.map(o => (
              <div key={o.id} style={{ background: '#f7fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: 600, marginBottom: '4px' }}>TRIGGER</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>"{o.trigger_phrase}"</div>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: 600, marginBottom: '4px' }}>RESPONSE</div>
                    <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.5 }}>{o.response.length > 150 ? o.response.slice(0, 150) + '...' : o.response}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => edit(o)} style={{ background: '#bee3f8', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#2b6cb0' }}>Edit</button>
                    <button onClick={() => del(o.id)} style={{ background: '#fed7d7', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#c53030' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin App ────────────────────────────────────────────────────────
function AdminApp() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('admin_user');
    return u ? JSON.parse(u) : null;
  });
  const token = localStorage.getItem('admin_token');
  const [tab, setTab] = useState('knowledge');

  if (!user) return <LoginPage onLogin={setUser} />;

  const tabs = [
    { id: 'knowledge', label: 'Knowledge Base', icon: '📚' },
    { id: 'overrides', label: 'Bot Overrides', icon: '✏️' },
  ];

  return (
    <div style={{ ...S.page, display: 'flex' }}>
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>🏦 Paysys Labs</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '2px' }}>Admin Panel</div>
        </div>
        <div style={{ marginTop: '16px', flex: 1 }}>
          {tabs.map(t => (
            <div key={t.id} style={S.sidebarItem(tab === t.id)} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span><span>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>{user.name}</div>
          <button onClick={() => { localStorage.clear(); setUser(null); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '12px', width: '100%' }}>
            Sign Out
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {tab === 'knowledge' && <KnowledgeBase token={token} />}
        {tab === 'overrides' && <BotOverrides token={token} />}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);
