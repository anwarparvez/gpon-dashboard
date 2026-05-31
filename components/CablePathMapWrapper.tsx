'use client';

import dynamic from 'next/dynamic';

const CablePathMap = dynamic(() => import('@/components/CablePathMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading cable path designer...</p>
      </div>
    </div>
  ),
});

export default function CablePathMapWrapper() {
  return <CablePathMap />;
}