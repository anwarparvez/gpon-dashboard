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

// 📍 Capture click
function LocationPicker({ setSelected }) {
  useMapEvents({
    click(e) {
      console.log("Clicked:", e.latlng);

      setSelected({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    },
  });

  return null;
}

export default function MapAdd() {
  const [nodes, setNodes] = useState([]);
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('ODP');

  // 🔹 Load nodes
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => setNodes(data))
      .catch(err => console.error(err));
  }, []);

  // 🔹 Save node
  const handleSubmit = async () => {
    if (!selected || !name) {
      alert("Select location and enter name");
      return;
    }

    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        latitude: selected.latitude,
        longitude: selected.longitude,
        node_category: category
      })
    });

    const saved = await res.json();
    setNodes(prev => [saved, ...prev]);

    // reset
    setName('');
    setCategory('ODP');
    setSelected(null);
  };

  // 🎨 Color by category
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
    <div style={{ display: 'flex' }}>

      {/* 🗺️ MAP */}
      <div style={{ width: '70%' }}>
        <MapContainer
          center={[23.73, 90.41]}
          zoom={13}
          style={{ height: '90vh' }}
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

              <Tooltip>
                {node.node_id}
              </Tooltip>
            </CircleMarker>
          ))}

          {/* Selected point */}
          {selected && (
            <CircleMarker
              center={[selected.latitude, selected.longitude]}
              radius={8}
              pathOptions={{ color: 'red' }}
            />
          )}

          <LocationPicker setSelected={setSelected} />
        </MapContainer>
      </div>

      {/* 📝 FORM PANEL */}
      <div
        style={{
          width: '30%',
          padding: '15px',
          background: '#ffffff',
          color: '#000',
          borderLeft: '2px solid #ccc'
        }}
      >
        <h3>Add Node</h3>

        {selected ? (
          <div style={{ marginBottom: '10px' }}>
            <b>Selected Location:</b><br />
            Lat: {selected.latitude.toFixed(6)}<br />
            Lon: {selected.longitude.toFixed(6)}
          </div>
        ) : (
          <p style={{ color: 'red' }}>
            Click on map to select location
          </p>
        )}

        <input
          type="text"
          placeholder="Node Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
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
            padding: '10px',
            background: 'blue',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Save Node
        </button>
      </div>
    </div>
  );
}