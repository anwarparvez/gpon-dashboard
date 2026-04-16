'use client';

import dynamic from 'next/dynamic';

const MapAdd = dynamic(() => import('./MapAdd'), {
  ssr: false
});

export default function MapAddWrapper() {
  return <MapAdd />;
}