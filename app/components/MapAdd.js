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

// 📍 Add Node Popup
function AddNodePopup({ onSave }) {
  const [position, setPosition] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ODP');

  // ✅ DEFAULT VALUES
  const [status, setStatus] = useState('proposed');
  const [dgm, setDgm] = useState('DGM Phones Secretariate');
  const [region, setRegion] = useState('DTR South');

  useMapEvents({
    click(e) {
      setPosition(e.latlng);

      // reset form
      setName('');
      setCategory('ODP');
      setStatus('proposed');

      // 🔥 default values
      setDgm('DGM Phones Secretariate');
      setRegion('DTR South');
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
      node_category: category,
      status,
      dgm,
      region
    });

    setPosition(null);
  };

  return position ? (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={8}
      pathOptions={{ color: 'red' }}
    >
      <Popup open={true}>
        <div style={{ width: '220px' }}>
          <b>Add Node</b><br /><br />

          <input
            placeholder="Node Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', marginBottom: '6px' }}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', marginBottom: '6px' }}
          >
            <option>OLT</option>
            <option>OCC</option>
            <option>ODP</option>
            <option>HODP</option>
            <option>Branch Point</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', marginBottom: '6px' }}
          >
            <option value="existing">Existing</option>
            <option value="proposed">Proposed</option>
          </select>

          <input
            value={dgm}
            onChange={(e) => setDgm(e.target.value)}
            style={{ width: '100%', marginBottom: '6px' }}
          />

          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ width: '100%', marginBottom: '6px' }}
          />

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

  // 📡 Load nodes
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(setNodes);
  }, []);

  // 💾 Save node
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
  const getColor = (node) => {
    if (node.status === 'existing') return 'green';
    if (node.status === 'proposed') return 'orange';

    switch (node.node_category) {
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
          pathOptions={{ color: getColor(node) }}
        >
          <Popup>
            <b>{node.name}</b><br />
            ID: {node.node_id}<br />
            Type: {node.node_category}<br />
            Status: {node.status}<br />
            DGM: {node.dgm}<br />
            Region: {node.region}
          </Popup>

          <Tooltip>{node.node_id}</Tooltip>
        </CircleMarker>
      ))}

      {/* Add node form */}
      <AddNodePopup onSave={handleSave} />

    </MapContainer>
  );
}