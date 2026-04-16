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

function LocationMarker({ setSelected }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setSelected({ lat, lng });
    },
  });

  return null;
}

export default function Map() {
  const [nodes, setNodes] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/gpon_nodes.json')
      .then(res => res.json())
      .then(data => setNodes(data));
  }, []);

  return (
    <>
      <MapContainer
        center={[23.73, 90.41]}
        zoom={13}
        style={{ height: '80vh', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Existing Nodes */}
        {nodes.map(node => (
          <CircleMarker
            key={node.id}
            center={[node.latitude, node.longitude]}
            radius={4}
          >
            <Popup>{node.name}</Popup>
          </CircleMarker>
        ))}

        {/* Click handler */}
        <LocationMarker setSelected={setSelected} />

        {/* Show selected point */}
        {selected && (
          <CircleMarker
            center={[selected.lat, selected.lng]}
            radius={6}
            pathOptions={{ color: 'red' }}
          >
            <Popup>
              Selected Point<br />
              Lat: {selected.lat}<br />
              Lon: {selected.lng}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Display outside map */}
      {selected && (
        <div style={{ padding: '10px' }}>
          <b>Selected Coordinates:</b><br />
          Latitude: {selected.lat} <br />
          Longitude: {selected.lng}
        </div>
      )}
    </>
  );
}