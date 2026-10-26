import { redirect } from 'next/navigation';
import { requireTerminalUser } from '@/lib/terminal-auth';
export default async function HomePage() {
  await requireTerminalUser();
  redirect('/terminal/overview');
}
