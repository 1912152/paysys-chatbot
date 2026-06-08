import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Attention pulse after 8 seconds if not opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setPulseCount(c => c + 1);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{ marginBottom: '16px' }}>
          <ChatWindow onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Launcher Button */}
      {!isOpen && (
        <div style={{ position: 'relative' }}>
          {/* Notification badge */}
          {hasNewMessage && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '14px',
              height: '14px',
              background: '#e53e3e',
              borderRadius: '50%',
              border: '2px solid white',
              zIndex: 1
            }} />
          )}

          {/* Tooltip */}
          <div style={{
            position: 'absolute',
            bottom: '68px',
            right: '0',
            background: '#1a202c',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeInUp 0.3s ease forwards'
          }}>
            Ask about our products 👋
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              right: '20px',
              width: '10px',
              height: '10px',
              background: '#1a202c',
              transform: 'rotate(45deg)'
            }} />
          </div>

          <button
            onClick={handleOpen}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #16659c, #1a7db5)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(22, 101, 156, 0.5)',
              animation: pulseCount > 0 ? 'pulse 1s ease 3' : 'none',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(22, 101, 156, 0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(22, 101, 156, 0.5)';
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Close button (when open) */}
      {isOpen && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#1a202c',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              color: 'white',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
