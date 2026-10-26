"use client";

import { useState } from 'react';
import { SessionHygiene } from '@/components/terminal/SessionHygiene';

export function LoginClient() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/terminal/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? 'Unable to sign in.'); return; }
      form.reset();
      window.location.replace('/terminal/overview');
    } catch { setError('Connection unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  return (
    <main className="pt-login">
      <SessionHygiene />
      <div className="pt-login-top"><a href="/login" className="pt-wordmark">Pledge<span>OFF</span><i /></a><span className="pt-eyebrow">PRIVATE WORKSPACE</span></div>
      <div className="pt-login-grid">
        <section className="pt-login-intro">
          <div className="pt-kicker"><span className="pt-dot" /> A quieter perspective.</div>
          <h1>Your markets.<br />Your decisions.<br /><span>Your space.</span></h1>
          <p>A focused financial workspace.<br />Private by design. Clear by intention.</p>
          <div className="pt-orbit" aria-hidden="true"><div /><div /><span>PO<span>↗</span></span></div>
          <span className="pt-login-caption">LESS NOISE. MORE PERSPECTIVE.</span>
        </section>
        <section className="pt-login-card" aria-labelledby="access-heading">
          <div className="pt-lock" aria-hidden="true">⌑</div>
          <span className="pt-eyebrow">AUTHORIZED ACCESS ONLY</span>
          <h2 id="access-heading">Welcome back.</h2>
          <p>Sign in to your private terminal.</p>
          <form onSubmit={submit}>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} placeholder="Your username" />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} placeholder="Enter your password" />
            <div className="pt-form-error" role="alert">{error}</div>
            <button className="pt-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Enter workspace'}<span aria-hidden="true">↗</span></button>
          </form>
          <div className="pt-login-security"><span className="pt-dot" /> Secure session · Restricted access</div>
          <p className="pt-access-note">Access is provisioned privately. Contact your administrator for password recovery.</p>
        </section>
      </div>
      <footer className="pt-login-footer"><span>© {new Date().getFullYear()} PledgeOFF</span><span>PRIVATE FINANCIAL TERMINAL <span className="pt-muted">/ PHASE 01</span></span></footer>
    </main>
  );
}
