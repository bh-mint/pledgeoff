'use client';

import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getAuthToken } from '@/lib/auth-client';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

type CheckoutModalProps = {
  priceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function CheckoutModal({ priceId, isOpen, onClose }: CheckoutModalProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const token = await getAuthToken();
    const res = await fetch('/api/v1/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ priceId, embedded: true }),
    });
    const json = await res.json() as { data?: { clientSecret: string }; error?: { message: string } };
    if (!res.ok || !json.data?.clientSecret) {
      throw new Error(json.error?.message ?? 'Failed to start checkout');
    }
    return json.data.clientSecret;
  }, [priceId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* panel */}
      <div
        className="relative z-10 w-full max-w-xl mx-4 rounded-xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--t2)' }}>
            Secure checkout
          </span>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: 'var(--t2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Stripe Embedded Checkout */}
        <div className="p-1">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
