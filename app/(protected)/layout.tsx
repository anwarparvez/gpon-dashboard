import { requireAuth } from '@/lib/auth-check';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}