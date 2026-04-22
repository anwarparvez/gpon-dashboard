'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';

type LatLng = { lat: number; lng: number };

type ZoneType = {
  _id: string;
  geometry: {
    coordinates: number[][][]; // GeoJSON [ [ [lng, lat] ] ]
  };
};

type Props = {
  onZoneCreate: (coords: LatLng[]) => void;
  zones: ZoneType[];
  selectedZone: ZoneType | null;
};

export default function ZoneMapper({
  onZoneCreate,
  zones = [],
  selectedZone
}: Props) {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚫 prevent SSR crash
  if (!mounted) return null;

  const {
    MapContainer,
    TileLayer,
    FeatureGroup,
    Polygon,
    useMap
  } = require('react-leaflet');

  const { EditControl } = require('react-leaflet-draw');

  /* =========================
     🧠 HANDLE DRAW CREATE
  ========================= */
  const handleCreate = (e: any) => {
    const layer = e.layer;

    if (layer instanceof L.Polygon) {

      const latlngs = layer.getLatLngs();

      if (Array.isArray(latlngs) && Array.isArray(latlngs[0])) {

        const coords = (latlngs[0] as L.LatLng[]).map(p => ({
          lat: p.lat,
          lng: p.lng
        }));

        onZoneCreate(coords);
      }
    }
  };

  /* =========================
     🎯 ZOOM TO SELECTED ZONE
  ========================= */
  function ZoomToZone() {
    const map = useMap();

    useEffect(() => {
      if (!selectedZone) return;

      const raw = selectedZone.geometry.coordinates[0];

      // ✅ enforce tuple typing
      const coords: [number, number][] = raw
        .filter((p: number[]) => p.length === 2)
        .map(([lng, lat]) => [lat, lng] as [number, number]);

      if (coords.length === 0) return;

      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds);

    }, [selectedZone]);

    return null;
  }

  /* =========================
     🎨 COLOR GENERATOR
  ========================= */
  const getColor = (id: string) => {
    const colors = ['red', 'blue', 'green', 'purple', 'orange'];

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  /* =========================
     🗺 RENDER
  ========================= */
  return (
    <MapContainer
      center={[23.73, 90.41]}
      zoom={14}
      style={{ height: '100%' }}
    >

      <ZoomToZone />

      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* ✏️ DRAW TOOL */}
      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={handleCreate}
          draw={{
            polygon: true,
            rectangle: false,
            circle: false,
            marker: false,
            polyline: false
          }}
        />
      </FeatureGroup>

      {/* 🗺 EXISTING ZONES */}
      {zones.map((z) => {
        const coords: [number, number][] =
          z.geometry.coordinates[0].map(
            ([lng, lat]: number[]) => [lat, lng] as [number, number]
          );

        const color = getColor(z._id);

        return (
          <Polygon
            key={z._id}
            positions={coords}
            pathOptions={{
              color,
              fillOpacity: selectedZone?._id === z._id ? 0.6 : 0.2
            }}
          />
        );
      })}

    </MapContainer>
  );
}