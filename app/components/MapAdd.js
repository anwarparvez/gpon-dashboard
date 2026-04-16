'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function AddNode({ onAdd }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      const name = prompt("Enter node name:");
      if (!name) return;

      onAdd({
        id: Date.now(),
        name,
        latitude: lat,
        longitude: lng
      });
    },
  });

  return null;
}

export default function MapAdd() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('custom_nodes')) || [];
    setNodes(saved);
  }, []);

  const handleAddNode = (node) => {
    const updated = [...nodes, node];
    setNodes(updated);
    localStorage.setItem('custom_nodes', JSON.stringify(updated));
  };

  return (
    <>
      <MapContainer
        center={[23.73, 90.41]}
        zoom={13}
        style={{ height: '85vh', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {nodes.map(node => (
          <CircleMarker
            key={node.id}
            center={[node.latitude, node.longitude]}
            radius={6}
            pathOptions={{ color: 'red' }}
          >
            <Popup>
              <b>{node.name}</b><br/>
              {node.latitude}, {node.longitude}
            </Popup>
          </CircleMarker>
        ))}

        <AddNode onAdd={handleAddNode} />
      </MapContainer>

      {/* Export Button */}
      <div style={{ padding: '10px' }}>
        <button onClick={() => {
          const data = localStorage.getItem('custom_nodes');
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'custom_nodes.json';
          a.click();
        }}>
          Export Nodes
        </button>
      </div>
    </>
  );
}