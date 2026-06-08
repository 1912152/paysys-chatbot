import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import LeadForm from './LeadForm';
import { useWebSocket } from '../hooks/useWebSocket';
import { getSessionId } from '../utils/session';

const SUGGESTED_QUESTIONS = [
  "What is Open Connect?",
  "Tell me about Open Wallet",
  "What fraud detection solutions do you offer?",
  "How does Open Digital Banking work?",
];

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'bot',
  content: "👋 Hi! I'm the Paysys Labs AI Assistant.\n\nI can help you learn about our fintech products and services — Open Connect, Open Wallet, Open Digital, and more.\n\nHow can I help you today?",
  timestamp: new Date().toISOString()
};

export default function ChatWindow({ onClose }) {
  const sessionId = getSessionId();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [chatMode, setChatMode] = useState('bot'); // bot | escalated | live
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { send, connected } = useWebSocket(sessionId, (data) => {
    switch (data.type) {
      case 'ready':
        break;

      case 'bot_response':
        setIsTyping(false);
        addMessage({ sender: 'bot', content: data.message });
        if (data.should_escalate && !leadSubmitted) {
          setTimeout(() => setShowLeadForm(true), 600);
        }
        break;

      case 'escalation_confirmed':
        setShowLeadForm(false);
        setLeadSubmitted(true);
        setChatMode('escalated');
        addMessage({ sender: 'system', content: '✅ Team notified — an agent will join shortly' });
        break;

      case 'agent_joined':
        setChatMode('live');
        addMessage({ sender: 'system', content: '🟢 Connected to Paysys representative' });
        addMessage({ sender: 'agent', content: data.message });
        break;

      case 'agent_message':
        addMessage({ sender: 'agent', content: data.message });
        break;

      case 'conversation_closed':
        setChatMode('closed');
        addMessage({ sender: 'system', content: data.message });
        break;

      default:
        break;
    }
  });

  const addMessage = (msg) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showLeadForm]);

  const sendMessage = (text) => {
    const message = text || input.trim();
    if (!message || !connected) return;

    setShowSuggestions(false);
    addMessage({ sender: 'visitor', content: message });
    setInput('');

    if (chatMode === 'live') {
      send({ type: 'chat_message', message });
    } else {
      setIsTyping(true);
      send({ type: 'chat_message', message });
    }
    inputRef.current?.focus();
  };

  const handleEscalate = () => {
    if (!leadSubmitted) setShowLeadForm(true);
  };

  const handleLeadSubmit = (leadData) => {
    send({ type: 'escalate', lead: leadData });
    setShowLeadForm(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '580px',
      width: '380px',
      background: '#f8fafc',
      borderRadius: '20px',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      animation: 'fadeInUp 0.3s ease forwards'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #16659c 0%, #1a7db5 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>
            🏦
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>Paysys Labs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '7px', height: '7px',
                background: chatMode === 'live' ? '#68d391' : '#90cdf4',
                borderRadius: '50%'
              }} />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>
                {chatMode === 'live' ? 'Agent Online' : 'AI Assistant'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!leadSubmitted && chatMode === 'bot' && (
            <button
              onClick={handleEscalate}
              title="Talk to human"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              👤 Talk to Team
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              width: '32px', height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Suggested Questions */}
        {showSuggestions && messages.length === 1 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '8px', textAlign: 'center' }}>
              Suggested questions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: 'white',
                    border: '1.5px solid #bee3f8',
                    borderRadius: '12px',
                    padding: '9px 14px',
                    fontSize: '12.5px',
                    color: '#16659c',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#e8f2fa'}
                  onMouseLeave={e => e.target.style.background = 'white'}
                >
                  {q} →
                </button>
              ))}
            </div>
          </div>
        )}

        {isTyping && (
          <div style={{ marginTop: '4px' }}>
            <TypingIndicator />
          </div>
        )}

        {showLeadForm && !leadSubmitted && (
          <LeadForm
            onSubmit={handleLeadSubmit}
            onSkip={() => setShowLeadForm(false)}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        flexShrink: 0
      }}>
        {!connected && (
          <div style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#e53e3e',
            marginBottom: '8px'
          }}>
            Reconnecting...
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'live'
                ? 'Message the agent...'
                : chatMode === 'escalated'
                ? 'Waiting for agent...'
                : 'Ask about our products...'
            }
            disabled={chatMode === 'escalated' || chatMode === 'closed'}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '13.5px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              lineHeight: '1.5',
              maxHeight: '80px',
              overflow: 'auto',
              background: chatMode === 'escalated' ? '#f7fafc' : 'white',
              color: '#1a202c'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !connected || chatMode === 'escalated'}
            style={{
              width: '40px', height: '40px',
              background: input.trim() && connected ? '#16659c' : '#e2e8f0',
              border: 'none',
              borderRadius: '12px',
              cursor: input.trim() && connected ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: '#cbd5e0',
          marginTop: '8px'
        }}>
          Powered by Paysys Labs AI
        </div>
      </div>
    </div>
  );
}
