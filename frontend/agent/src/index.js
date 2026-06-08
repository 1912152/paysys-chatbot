import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

const S = {
  page: { minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Inter',sans-serif", display: 'flex' },
  sidebar: { width: '260px', background: '#1a202c', minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  card: { background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  btn: (v = 'primary') => ({
    padding: '9px 18px', borderRadius: '9px', border: 'none',
    fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '13px', cursor: 'pointer',
    background: v === 'primary' ? '#16659c' : v === 'green' ? '#38a169' : v === 'danger' ? '#e53e3e' : '#edf2f7',
    color: v === 'ghost' ? '#4a5568' : 'white'
  }),
  badge: (c) => ({
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    background: c === 'green' ? '#c6f6d5' : c === 'orange' ? '#feebc8' : c === 'blue' ? '#bee3f8' : '#e2e8f0',
    color: c === 'green' ? '#276749' : c === 'orange' ? '#c05621' : c === 'blue' ? '#2b6cb0' : '#4a5568'
  })
};

// ─── Login ─────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('agent1@paysyslabs.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      localStorage.setItem('agent_token', data.access_token);
      localStorage.setItem('agent_user', JSON.stringify(data));
      onLogin(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#e8f2fa,#f0f7ff)' }}>
      <div style={{ ...S.card, width: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>💬</div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>Agent Panel</div>
          <div style={{ fontSize: '12px', color: '#718096' }}>Paysys Labs Live Chat</div>
        </div>
        {error && <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#c53030' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none' }} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none' }} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          <button style={{ ...S.btn('primary'), padding: '12px' }} onClick={login} disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation List Item ─────────────────────────────────────────────────
function ConvItem({ conv, isSelected, onClick, isNew }) {
  const statusColor = conv.status === 'live' ? 'green' : conv.status === 'escalated' ? 'orange' : 'blue';
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        background: isSelected ? 'rgba(22,101,156,0.12)' : isNew ? 'rgba(255,165,0,0.08)' : 'transparent',
        borderLeft: isSelected ? '3px solid #16659c' : isNew ? '3px solid #ed8936' : '3px solid transparent',
        transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
          {conv.visitor?.name || 'Anonymous'}
          {isNew && <span style={{ marginLeft: '6px', background: '#ed8936', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>NEW</span>}
        </div>
        <span style={S.badge(statusColor)}>{conv.status}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{conv.visitor?.company || 'Unknown company'}</div>
      <div style={{ fontSize: '11px', color: '#4299e1', marginTop: '3px' }}>{conv.product_interest || 'General'}</div>
    </div>
  );
}

// ─── Chat Panel ─────────────────────────────────────────────────────────────
function ChatPanel({ conv, token, agentId, wsReady, onSend, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [leadStatus, setLeadStatus] = useState(conv.lead_status || 'new');
  const bottomRef = useRef();

  useEffect(() => {
    fetch(`${API}/api/leads/conversations/${conv.id}/messages?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      });
    setLeadStatus(conv.lead_status || 'new');
  }, [conv.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Listen for new messages to this conversation
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;
      if (d.conversation_id === conv.id && d.type === 'new_message') {
        setMessages(prev => [...prev, d.message]);
      }
    };
    window.addEventListener('agent_message', handler);
    return () => window.removeEventListener('agent_message', handler);
  }, [conv.id]);

  const sendMessage = () => {
    if (!input.trim()) return;
    onSend(conv.id, input.trim());
    setMessages(prev => [...prev, { sender: 'agent', content: input.trim(), created_at: new Date().toISOString() }]);
    setInput('');
  };

  const updateLeadStatus = async (status) => {
    await fetch(`${API}/api/leads/conversations/${conv.id}/lead-status?status=${status}&token=${token}`, { method: 'PUT' });
    setLeadStatus(status);
  };

  const senderColors = { visitor: '#edf2f7', bot: '#e8f4ff', agent: '#f0fff4' };
  const senderLabel = { visitor: '👤 Visitor', bot: '🤖 Bot', agent: '👨‍💼 You' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Visitor Info Header */}
      <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{conv.visitor?.name || 'Anonymous'}</div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            {conv.visitor?.email} · {conv.visitor?.company} · 🎯 {conv.product_interest}
          </div>
          {conv.summary && (
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px', fontStyle: 'italic', maxWidth: '400px' }}>
              Summary: {conv.summary}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={leadStatus}
            onChange={e => updateLeadStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px', fontFamily: 'Inter,sans-serif', outline: 'none', cursor: 'pointer' }}
          >
            {['new', 'assigned', 'in_progress', 'resolved', 'closed'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          {conv.status !== 'live' && (
            <button style={S.btn('green')} onClick={() => onSend(conv.id, null, 'take')}>
              Take Over Chat
            </button>
          )}
          <button style={S.btn('danger')} onClick={() => onSend(conv.id, null, 'close')}>
            Close
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'visitor' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: '10px', color: '#a0aec0', marginBottom: '3px' }}>{senderLabel[m.sender] || m.sender}</div>
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: '12px',
              background: m.sender === 'visitor' ? '#bee3f8' : m.sender === 'agent' ? '#c6f6d5' : 'white',
              fontSize: '13px', lineHeight: '1.6', border: '1px solid #e2e8f0',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {conv.status === 'live' && (
        <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
          <input
            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none' }}
            placeholder="Type your reply..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button style={S.btn('primary')} onClick={sendMessage} disabled={!input.trim()}>Send</button>
        </div>
      )}
    </div>
  );
}

// ─── Stats Dashboard ────────────────────────────────────────────────────────
function Dashboard({ token }) {
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch(`${API}/api/leads/stats?token=${token}`).then(r => r.json()).then(setStats);
  }, []);

  const statCards = [
    { label: 'Total Conversations', value: stats.total_conversations || 0, icon: '💬', color: '#bee3f8' },
    { label: 'Awaiting Agent', value: stats.escalated || 0, icon: '🔔', color: '#feebc8' },
    { label: 'Live Chats', value: stats.live || 0, icon: '🟢', color: '#c6f6d5' },
    { label: 'Closed', value: stats.closed || 0, icon: '✅', color: '#e2e8f0' },
  ];

  return (
    <div style={{ padding: '28px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '26px', background: s.color, borderRadius: '10px', padding: '10px' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#718096' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      {stats.top_products?.length > 0 && (
        <div style={S.card}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>🎯 Top Product Interests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.top_products.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '20px', fontSize: '13px', color: '#a0aec0', fontWeight: 600 }}>#{i+1}</div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{p.product}</div>
                <div style={{ background: '#bee3f8', color: '#2b6cb0', borderRadius: '20px', padding: '2px 12px', fontSize: '12px', fontWeight: 600 }}>{p.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Agent App ─────────────────────────────────────────────────────────
function AgentApp() {
  const [user, setUser] = useState(() => { const u = localStorage.getItem('agent_user'); return u ? JSON.parse(u) : null; });
  const token = localStorage.getItem('agent_token');
  const [tab, setTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newConvIds, setNewConvIds] = useState(new Set());
  const ws = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/leads/conversations?token=${token}`);
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const interval = setInterval(loadConversations, 10000);

    // WebSocket for real-time
    const connect = () => {
      ws.current = new WebSocket(`${WS}/ws/agent/${user.user_id}`);
      ws.current.onopen = () => setWsConnected(true);
      ws.current.onclose = () => { setWsConnected(false); setTimeout(connect, 3000); };
      ws.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'new_escalation') {
          setNewConvIds(prev => new Set([...prev, data.conversation_id]));
          loadConversations();
          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification('New Lead - Paysys Chatbot', {
              body: `${data.visitor?.name || 'Visitor'} from ${data.visitor?.company || 'Unknown'} - ${data.visitor?.product_interest || 'General'}`,
              icon: '/favicon.ico'
            });
          }
        } else if (data.type === 'visitor_message') {
          window.dispatchEvent(new CustomEvent('agent_message', {
            detail: { conversation_id: data.conversation_id, type: 'new_message', message: { sender: 'visitor', content: data.message, created_at: new Date().toISOString() } }
          }));
        }
      };
    };
    connect();
    if (Notification.permission === 'default') Notification.requestPermission();
    return () => { clearInterval(interval); ws.current?.close(); };
  }, [user, loadConversations]);

  const handleSend = (convId, message, action) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    if (action === 'take') {
      ws.current.send(JSON.stringify({ type: 'take_conversation', conversation_id: convId }));
      loadConversations();
    } else if (action === 'close') {
      ws.current.send(JSON.stringify({ type: 'close_conversation', conversation_id: convId }));
      setSelected(null);
      loadConversations();
    } else if (message) {
      ws.current.send(JSON.stringify({ type: 'agent_message', conversation_id: convId, message }));
    }
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'chats', icon: '💬', label: `Live Chats${conversations.filter(c => c.status === 'escalated' || c.status === 'live').length > 0 ? ` (${conversations.filter(c => c.status === 'escalated' || c.status === 'live').length})` : ''}` },
    { id: 'all', icon: '📋', label: 'All Leads' },
  ];

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>💬 Agent Panel</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <div style={{ width: '8px', height: '8px', background: wsConnected ? '#68d391' : '#fc8181', borderRadius: '50%' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{wsConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {tabs.map(t => (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer',
                color: tab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                background: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: tab === t.id ? '3px solid #16659c' : '3px solid transparent',
                fontSize: '13px', fontWeight: tab === t.id ? 600 : 400
              }}
            >
              <span>{t.icon}</span><span>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>{user.name}</div>
          <button onClick={() => { localStorage.clear(); setUser(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '12px', width: '100%' }}>Sign Out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {tab === 'dashboard' && <div style={{ flex: 1, overflowY: 'auto' }}><Dashboard token={token} /></div>}

        {(tab === 'chats' || tab === 'all') && (
          <>
            {/* Conversation List */}
            <div style={{ width: '280px', background: '#2d3748', overflowY: 'auto', borderRight: '1px solid #4a5568' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #4a5568' }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>
                  {tab === 'chats' ? 'Active Conversations' : 'All Leads'}
                </div>
              </div>
              {conversations
                .filter(c => tab === 'all' ? true : c.status === 'escalated' || c.status === 'live')
                .map(c => (
                  <ConvItem
                    key={c.id} conv={c}
                    isSelected={selected?.id === c.id}
                    isNew={newConvIds.has(c.id)}
                    onClick={() => { setSelected(c); setNewConvIds(prev => { const n = new Set(prev); n.delete(c.id); return n; }); }}
                  />
                ))
              }
              {conversations.filter(c => tab === 'all' ? true : c.status === 'escalated' || c.status === 'live').length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                  {tab === 'chats' ? 'No active conversations' : 'No leads yet'}
                </div>
              )}
            </div>

            {/* Chat or Empty State */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {selected ? (
                <ChatPanel conv={selected} token={token} agentId={user.user_id} wsReady={wsConnected} onSend={handleSend} onClose={() => setSelected(null)} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#a0aec0' }}>
                  <div style={{ fontSize: '48px' }}>💬</div>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>Select a conversation</div>
                  <div style={{ fontSize: '13px' }}>Pick from the left to start chatting</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AgentApp />);
