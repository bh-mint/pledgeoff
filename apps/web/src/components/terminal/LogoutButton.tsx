"use client";
import { useState } from 'react';
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/terminal/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) throw new Error();
      window.location.replace('/login');
    } catch { setError('Sign out failed. Try again.'); setBusy(false); }
  }
  return <div><button className="pt-logout" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : '↗ Sign out'}</button>{error && <p role="alert" className="pt-form-error">{error}</p>}</div>;
}
