import React from 'react';

export default function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '12px 16px',
      background: 'white',
      borderRadius: '18px 18px 18px 4px',
      width: 'fit-content',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0'
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#16659c',
          animation: `typingDot 1.2s ease infinite`,
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}
