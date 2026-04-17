'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// 🔥 Dynamic imports (CRITICAL FIX)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });

import MapClickHandler from './MapClickHandler';
import NodeSidebar from './NodeSidebar';
import LinkSidebar from './LinkSidebar';
import NodeMarker from './NodeMarker';
import LinkLine from './LinkLine';

export default function MapView() {
  const [mounted, setMounted] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [draftNode, setDraftNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);

  useEffect(() => {
    setMounted(true);

    fetch('/api/nodes').then(r => r.json()).then(setNodes);
    fetch('/api/links').then(r => r.json()).then(setLinks);
  }, []);

  // 🚫 Prevent hydration issues
  if (!mounted) return null;

  return (
    <>
      <NodeSidebar draft={draftNode} setDraft={setDraftNode} setNodes={setNodes} />

      <LinkSidebar
        selectedNodes={selectedNodes}
        setSelectedNodes={setSelectedNodes}
        setLinks={setLinks}
      />

      <MapContainer
        key="main-map"
        center={[23.73, 90.41]}
        zoom={13}
        style={{ height: '90vh', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapClickHandler setDraft={setDraftNode} />

        {nodes.map(n => (
          <NodeMarker
            key={n._id}
            node={n}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
          />
        ))}

        {links.map(l => (
          <LinkLine key={l._id} link={l} />
        ))}
      </MapContainer>
    </>
  );
}