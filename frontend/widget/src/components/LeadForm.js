import React, { useState } from 'react';

export default function LeadForm({ onSubmit, onSkip }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(form);
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${errors[field] ? '#fc8181' : '#e2e8f0'}`,
    borderRadius: '10px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
    background: 'white'
  });

  return (
    <div style={{
      background: 'linear-gradient(135deg, #e8f2fa 0%, #f0f7ff 100%)',
      borderRadius: '16px',
      padding: '20px',
      margin: '8px 0',
      border: '1px solid #bee3f8'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '36px', height: '36px',
          background: '#16659c',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px'
        }}>👤</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a202c' }}>Connect with our team</div>
          <div style={{ fontSize: '12px', color: '#718096' }}>A specialist will reach you shortly</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <input
            placeholder="Full Name *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={inputStyle('name')}
          />
          {errors.name && <div style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.name}</div>}
        </div>

        <div>
          <input
            placeholder="Email Address *"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={inputStyle('email')}
          />
          {errors.email && <div style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.email}</div>}
        </div>

        <input
          placeholder="Phone Number"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          style={inputStyle('phone')}
        />

        <input
          placeholder="Company / Organization"
          value={form.company}
          onChange={e => setForm({ ...form, company: e.target.value })}
          style={inputStyle('company')}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: '11px',
            background: '#16659c',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Connect Now →
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: '11px 16px',
            background: 'white',
            color: '#718096',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
