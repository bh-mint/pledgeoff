import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth-state.json');
// Logged-out baseline: no app session, but carries the Vercel deployment-
// protection bypass cookie when staging sits behind Vercel Authentication.
export const PUBLIC_STATE = path.join(__dirname, '.public-state.json');
