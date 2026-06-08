import React from 'react';

export default function MessageBubble({ message }) {
  const isVisitor = message.sender === 'visitor';
  const isAgent = message.sender === 'agent';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div style={{
        textAlign: 'center',
        margin: '8px 0'
      }}>
        <span style={{
          background: '#edf2f7',
          color: '#718096',
          fontSize: '11px',
          padding: '4px 12px',
          borderRadius: '20px',
          display: 'inline-block'
        }}>
          {message.content}
        </span>
      </div>
    );
  }

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isVisitor ? 'flex-end' : 'flex-start',
      marginBottom: '6px',
      animation: 'fadeInUp 0.25s ease forwards'
    }}>
      {/* Avatar for bot/agent */}
      {!isVisitor && (
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: isAgent ? '#38a169' : '#16659c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          marginRight: '8px',
          flexShrink: 0,
          alignSelf: 'flex-end'
        }}>
          {isAgent ? '👤' : '🤖'}
        </div>
      )}

      <div style={{ maxWidth: '78%' }}>
        {/* Sender label */}
        {isAgent && (
          <div style={{ fontSize: '10px', color: '#38a169', marginBottom: '3px', fontWeight: 600 }}>
            Paysys Team
          </div>
        )}

        <div style={{
          padding: '10px 14px',
          borderRadius: isVisitor
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
          background: isVisitor
            ? 'linear-gradient(135deg, #16659c, #1a7db5)'
            : 'white',
          color: isVisitor ? 'white' : '#1a202c',
          fontSize: '13.5px',
          lineHeight: '1.6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: isVisitor ? 'none' : '1px solid #e2e8f0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {message.content}
        </div>

        {time && (
          <div style={{
            fontSize: '10px',
            color: '#a0aec0',
            marginTop: '3px',
            textAlign: isVisitor ? 'right' : 'left'
          }}>
            {time}
          </div>
        )}
      </div>
    </div>
  );
}
