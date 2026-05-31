import { requireAuth } from '@/lib/auth-check';
import CablePathMapWrapper from '@/components/CablePathMapWrapper';

export const dynamic = 'force-dynamic';

export default async function CablePathsPage() {
  await requireAuth();
  return <CablePathMapWrapper />;
}