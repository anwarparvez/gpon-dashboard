'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// 🔥 Load Leaflet components dynamically
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export default function NodeMapView({ node }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !node) return null;

  const position = [node.latitude, node.longitude];

  return (
    <MapContainer
      key={`${node._id}-${position}`}   // 🔥 CRITICAL FIX
      center={position}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={position}>
        <Popup>
          <b>{node.name}</b><br />
          {node.node_id}<br />
          {node.node_category}<br />
          {node.status}<br />
          {node.dgm}<br />
          {node.region}
        </Popup>
      </Marker>
    </MapContainer>
  );
}