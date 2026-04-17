'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

import MapClickHandler from './MapClickHandler';
import NodeSidebar from './NodeSidebar';
import LinkSidebar from './LinkSidebar';
import NodeMarker from './NodeMarker';
import LinkLine from './LinkLine';
import LeftSidebar from './LeftSidebar';

export default function MapView() {
  const [mounted, setMounted] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  const [draftNode, setDraftNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);

  const [mode, setMode] = useState('add-node');
  const [sidebarWidth, setSidebarWidth] = useState(200);

  useEffect(() => {
    setMounted(true);

    fetch('/api/nodes').then(r => r.json()).then(setNodes);
    fetch('/api/links').then(r => r.json()).then(setLinks);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <LeftSidebar mode={mode} setMode={setMode} setSidebarWidth={setSidebarWidth} />

      <NodeSidebar draft={draftNode} setDraft={setDraftNode} setNodes={setNodes} />
      <LinkSidebar selectedNodes={selectedNodes} setSelectedNodes={setSelectedNodes} setLinks={setLinks} />

      <div
        className="absolute top-[60px]"
        style={{
          left: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
          height: 'calc(100vh - 60px)'
        }}
      >
        <MapContainer center={[23.73, 90.41]} zoom={13} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapClickHandler setDraft={setDraftNode} mode={mode} />

          {/* Preview */}
          {draftNode && (
            <Marker
              position={[draftNode.latitude, draftNode.longitude]}
              icon={L.divIcon({
                className: '',
                html: `<div style="width:16px;height:16px;border-radius:50%;background:yellow;border:2px solid black;"></div>`
              })}
            />
          )}

          {/* Nodes */}
          {nodes.map(node => (
            <NodeMarker
              key={node._id}
              node={node}
              mode={mode}
              selectedNodes={selectedNodes}
              setSelectedNodes={setSelectedNodes}
              setNodes={setNodes}   // 🔥 pass setter
              setLinks={setLinks}   // 🔥 for auto link removal
            />
          ))}

          {/* Links */}
          {links.map(link => (
            <LinkLine
              key={link._id}
              link={link}
              setLinks={setLinks}
            />
          ))}
        </MapContainer>
      </div>
    </>
  );
}