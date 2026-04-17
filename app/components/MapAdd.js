'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMapEvents
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// 📍 Handle click + popup form
function AddNodePopup({ onSave }) {
  const [position, setPosition] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ODP');

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setName('');
      setCategory('ODP');
    },
  });

  const handleSubmit = () => {
    if (!name) {
      alert("Enter node name");
      return;
    }

    onSave({
      name,
      latitude: position.lat,
      longitude: position.lng,
      node_category: category
    });

    setPosition(null);
  };

  return position ? (
    <CircleMarker center={[position.lat, position.lng]} radius={8} pathOptions={{ color: 'red' }}>
      <Popup open={true}>
        <div style={{ width: '200px' }}>
          <b>Add Node</b><br /><br />

          <input
            type="text"
            placeholder="Node Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          >
            <option value="OLT">OLT</option>
            <option value="OCC">OCC</option>
            <option value="ODP">ODP</option>
            <option value="HODP">HODP</option>
            <option value="Branch Point">Branch Point</option>
          </select>

          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '6px',
              background: 'blue',
              color: 'white',
              border: 'none'
            }}
          >
            Save
          </button>
        </div>
      </Popup>
    </CircleMarker>
  ) : null;
}

export default function MapAdd() {
  const [nodes, setNodes] = useState([]);

  // Load nodes
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => setNodes(data));
  }, []);

  // Save node
  const handleSave = async (node) => {
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      });

      const saved = await res.json();
      setNodes(prev => [saved, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
  };

  // 🎨 Color logic
  const getColor = (type) => {
    switch (type) {
      case 'OLT': return 'black';
      case 'OCC': return 'purple';
      case 'HODP': return 'orange';
      case 'ODP': return 'blue';
      case 'Branch Point': return 'green';
      default: return 'gray';
    }
  };

  return (
    <MapContainer
      center={[23.73, 90.41]}
      zoom={13}
      style={{ height: '90vh', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Existing nodes */}
      {nodes.map(node => (
        <CircleMarker
          key={node._id}
          center={[node.latitude, node.longitude]}
          radius={6}
          pathOptions={{ color: getColor(node.node_category) }}
        >
          <Popup>
            <b>{node.name}</b><br />
            ID: {node.node_id}<br />
            Type: {node.node_category}
          </Popup>

          <Tooltip>{node.node_id}</Tooltip>
        </CircleMarker>
      ))}

      {/* Popup Form */}
      <AddNodePopup onSave={handleSave} />
    </MapContainer>
  );
}