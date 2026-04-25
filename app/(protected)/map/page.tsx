'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapViewClient'), {
  ssr: false
});

export default function Page() {
  return <MapView />;
}