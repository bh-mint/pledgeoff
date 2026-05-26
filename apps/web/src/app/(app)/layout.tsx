import { requireUser } from "@/lib/auth-server";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const initials = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <AppNav email={user.email ?? ""} initials={initials} />
      {children}
    </>
  );
}
