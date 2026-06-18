import { requireAdminServer } from "@/lib/admin-auth";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email } = await requireAdminServer();
  return <AdminShell email={email}>{children}</AdminShell>;
}
