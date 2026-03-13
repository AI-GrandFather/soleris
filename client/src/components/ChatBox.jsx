import { useState, useRef, useEffect } from 'react';

const VIEW_LABELS = {
  dashboard: 'Budget Planner',
  profit: 'Profit Calculator',
};

export default function ChatBox({ onDataChanged, activeView = 'dashboard' }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const historyRef  = useRef([]); // full history including tool messages, kept in sync

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    historyRef.current = [...historyRef.current, userMsg];
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyRef.current, activeView }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const errText = payload.error
          || (res.status === 404
            ? 'Chat endpoint not found. Restart the API server.'
            : `Chat request failed with status ${res.status}.`);
        const errMsg = { role: 'assistant', content: errText };
        setMessages(prev => [...prev, errMsg]);
        historyRef.current = historyRef.current.filter(msg => msg.role === 'user' || msg.role === 'assistant');
        return;
      }

      const data = await res.json();

      if (data.error) {
        const errMsg = { role: 'assistant', content: `Error: ${data.error}` };
        setMessages(prev => [...prev, errMsg]);
        historyRef.current = historyRef.current.filter(msg => msg.role === 'user' || msg.role === 'assistant');
      } else {
        const assistantMsg = { role: 'assistant', content: data.reply };
        historyRef.current = data.messages;
        setMessages(prev => [...prev, assistantMsg]);
        if (data.changed) onDataChanged?.();
      }
    } catch (err) {
      const errMsg = { role: 'assistant', content: 'Cannot reach the API server. Start or restart the backend and try again.' };
      setMessages(prev => [...prev, errMsg]);
      historyRef.current = historyRef.current.filter(msg => msg.role === 'user' || msg.role === 'assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const ui   = { fontFamily: 'var(--font-ui)' };

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          className="chat-toggle"
          onClick={() => setOpen(true)}
          title="Open AI assistant"
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--gold)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 200,
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'var(--gold-bright)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--gold)'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 380,
          height: 520,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-med)',
          borderTop: '2px solid var(--gold)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          borderRadius: 4,
          animation: 'slideInBottom 0.22s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-dim)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: 'var(--gold-dim)',
                border: '1px solid var(--border-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <div style={{ ...ui, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Soleris AI
                </div>
                <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 1 }}>
                  {VIEW_LABELS[activeView] ?? 'DASHBOARD'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { setMessages([]); historyRef.current = []; }}
                title="Clear chat"
                style={{
                  background: 'transparent', border: '1px solid var(--border-dim)',
                  color: 'var(--text-muted)', cursor: 'pointer', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M2 2h8M4 2V1h4v1M3 2l.5 9h5L9 2"/>
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Minimize"
                style={{
                  background: 'transparent', border: '1px solid var(--border-dim)',
                  color: 'var(--text-muted)', cursor: 'pointer', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                padding: '24px 16px',
              }}>
                <div style={{ ...mono, fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 8 }}>
                  SOLERIS AI ASSISTANT
                </div>
                <div style={{ ...ui, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ask me to update budgets, categories, inventory, or expenses. If a change needs more detail, I will ask a follow-up question first.
                </div>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'Set Bag 1 quantity to 200',
                    'Add an advertising expense of $500',
                    'Raise the operations budget to $3,000',
                    'What should I fix first in this dashboard?',
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setInput(hint); inputRef.current?.focus(); }}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'var(--text-secondary)',
                        ...ui,
                        fontSize: '0.72rem',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: 3,
                        transition: 'border-color 0.1s, color 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  background: msg.role === 'user' ? 'var(--gold-dim)' : 'var(--bg-elevated)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--border-gold)' : 'var(--border-dim)'}`,
                  borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                }}>
                  <div style={{
                    ...ui,
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '8px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: '8px 8px 8px 2px',
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--gold)',
                      animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            borderTop: '1px solid var(--border-dim)',
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            flexShrink: 0,
            background: 'var(--bg-surface)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything or request a change…"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-dim)',
                color: 'var(--text-primary)',
                ...ui,
                fontSize: '0.82rem',
                padding: '8px 10px',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: 96,
                overflowY: 'auto',
                borderRadius: 4,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold-bright)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 34,
                height: 34,
                background: input.trim() && !loading ? 'var(--gold)' : 'var(--bg-elevated)',
                border: '1px solid var(--border-dim)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                borderRadius: 4,
                transition: 'background 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={input.trim() && !loading ? '#fff' : 'var(--text-muted)'}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
