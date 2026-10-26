import { requireTerminalUser } from '@/lib/terminal-auth';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireTerminalUser();
  return <>{children}</>;
}
