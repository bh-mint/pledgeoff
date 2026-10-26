import { redirect } from 'next/navigation';
import { requireTerminalUser } from '@/lib/terminal-auth';
export default async function TerminalPage() { await requireTerminalUser(); redirect('/terminal/overview'); }
