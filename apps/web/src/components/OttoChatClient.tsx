'use client';

import { useState, useRef, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth-client';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Balance = {
  included: number;
  purchased: number;
  total: number;
  includedLimit: number;
  plan: string;
};

type Props = {
  ideaId: string;
  ideaText: string;
  verdict: string;
  reasoning: string;
  score: number;
  initialBalance: Balance;
  initialMessages: Message[];
};

const PACK_OPTIONS = [
  { count: 10, price: '€15', label: '10 questions' },
  { count: 25, price: '€30', label: '25 questions' },
  { count: 60, price: '€60', label: '60 questions' },
  { count: 150, price: '€120', label: '150 questions' },
] as const;

export default function OttoChatClient({
  ideaId, ideaText, verdict, reasoning, score,
  initialBalance, initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<Balance>(initialBalance);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;
    if (balance.total <= 0) { setShowBuyModal(true); return; }

    setInput('');
    setLoading(true);
    const userMsg: Message = { role: 'user', content: msg, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    const token = await getAuthToken();
    const res = await fetch('/api/v1/otto/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ideaId, ideaText, verdict, reasoning, score, message: msg }),
    });

    const json = await res.json() as { data?: { reply: string; balance: Balance }; error?: { code: string; message?: string } };

    if (!res.ok || json.error) {
      if (json.error?.code === 'OTTO_NO_QUESTIONS') {
        setShowBuyModal(true);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        const errMsg: Message = { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment.", createdAt: new Date().toISOString() };
        setMessages((prev) => [...prev, errMsg]);
      }
    } else if (json.data) {
      const assistantMsg: Message = { role: 'assistant', content: json.data.reply, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);
      setBalance(json.data.balance);
    }

    setLoading(false);
  }

  async function handleBuyPack(count: 10 | 25 | 60 | 150) {
    setBuyLoading(true);
    const token = await getAuthToken();
    const res = await fetch('/api/v1/billing/otto-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionCount: count }),
    });
    const json = await res.json() as { data?: { url: string } };
    if (json.data?.url) {
      window.location.assign(json.data.url);
    }
    setBuyLoading(false);
  }

  const balanceLabel = (() => {
    if (balance.plan === 'free') return null;
    if (balance.purchased > 0 && balance.included > 0)
      return `${balance.included} included + ${balance.purchased} extra available`;
    if (balance.purchased > 0)
      return `${balance.purchased} extra questions available`;
    if (balance.included > 0)
      return `${balance.included} / ${balance.includedLimit} included remaining`;
    return 'No questions remaining';
  })();

  return (
    <div className="mt-10 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <span className="mono text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--t3)' }}>
          Ask Otto
        </span>
        {balanceLabel && (
          <span className="mono text-[10px]" style={{ color: balance.total === 0 ? 'var(--kill)' : 'var(--t3)' }}>
            {balanceLabel}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-4 px-5 py-5 max-h-105 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && (
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--t3)' }}>
            Ask me anything about your idea — strategy, competition, go-to-market, what to build first.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user'
                ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                : { background: 'var(--surface)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 text-[13px]" style={{ background: 'var(--surface)', color: 'var(--t3)', border: '1px solid var(--border)' }}>
              <span className="animate-pulse">Otto is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder={balance.total === 0 ? 'No questions remaining — buy more to continue' : 'Ask Otto anything…'}
          disabled={loading || balance.total === 0}
          rows={2}
          className="flex-1 resize-none rounded-lg px-3 py-2 text-[13px] outline-none"
          style={{ background: 'var(--bg)', color: 'var(--t1)', border: '1px solid var(--border)' }}
        />
        {balance.total === 0 ? (
          <button
            onClick={() => setShowBuyModal(true)}
            className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-medium mono"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Buy questions
          </button>
        ) : (
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-medium mono disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Send
          </button>
        )}
      </div>

      {/* Buy modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-8 w-full max-w-sm mx-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--t3)' }}>
              Otto · Buy questions
            </div>
            <h2 className="display text-[22px] font-semibold mb-2" style={{ color: 'var(--t1)' }}>
              Continue the conversation
            </h2>
            <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'var(--t3)' }}>
              Questions never expire and work across all your ideas.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {PACK_OPTIONS.map((opt) => (
                <button
                  key={opt.count}
                  onClick={() => void handleBuyPack(opt.count)}
                  disabled={buyLoading}
                  className="flex justify-between items-center rounded-lg px-4 py-3 text-[13px] font-medium disabled:opacity-50"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                >
                  <span>{opt.label}</span>
                  <span className="mono" style={{ color: 'var(--accent)' }}>{opt.price}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBuyModal(false)}
              className="w-full text-center text-[12px] mono"
              style={{ color: 'var(--t3)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
