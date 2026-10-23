import { Sidebar } from '@/components/sidebar';
import { getProfile } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-[var(--brand-bg)]">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
