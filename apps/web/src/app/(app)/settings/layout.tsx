import { requireUser } from "@/lib/auth-server";
import { SettingsTabBar } from "./SettingsNav";
import { FooterMicro } from "@/components/FooterMicro";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <>
      <SettingsTabBar />
      <main className="max-w-[860px] mx-auto px-6 sm:px-10 pt-10 pb-20">
        {children}
      </main>
      <FooterMicro />
    </>
  );
}
