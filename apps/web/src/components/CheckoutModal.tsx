'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    setCheckoutError(null);
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
      const msg = json.error?.message ?? 'Failed to start checkout. Please try again.';
      setCheckoutError(msg);
      throw new Error(msg);
    }
    return json.data.clientSecret;
  }, [priceId]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      {/* backdrop — covers scroll container too */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* panel — relative so it sits above backdrop; flex column so header is fixed and body scrolls */}
      <div
        className="relative z-10 w-full max-w-xl rounded-xl flex flex-col my-auto"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          maxHeight: 'calc(100vh - 3rem)',
        }}
      >
        {/* header — never scrolls */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
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

        {/* body — scrolls when Stripe form is taller than available space */}
        <div className="overflow-y-auto flex-1 p-1">
          {checkoutError ? (
            <div className="p-6 flex flex-col items-center gap-4">
              <p className="mono text-[12px] text-center" style={{ color: 'var(--kill)' }}>
                {checkoutError}
              </p>
              <button
                onClick={onClose}
                className="mono text-[11px] h-9 px-5 rounded-md border"
                style={{ borderColor: 'var(--border)', color: 'var(--t2)' }}
              >
                Close
              </button>
            </div>
          ) : (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
}
