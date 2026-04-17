'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// 🔥 Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function NodeMapView({ node }) {

  if (!node) return null;

  const position = [node.latitude, node.longitude];

  return (
    <MapContainer
      center={position}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='© OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={position}>
        <Popup>
          <b>{node.name}</b><br />
          ID: {node.node_id}<br />
          Category: {node.node_category}<br />
          Status: {node.status}<br />
          DGM: {node.dgm}<br />
          Region: {node.region}
        </Popup>
      </Marker>
    </MapContainer>
  );
}