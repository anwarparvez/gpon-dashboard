import { getProgress } from '@/lib/migrateStore';

export async function GET() {
  return Response.json(getProgress());
}