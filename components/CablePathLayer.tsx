'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CablePath {
  _id: string;
  from_node_id: string;
  to_node_id: string;
  polyline: [number, number][];
  fiber_type: string;
  cable_type: string;
  length_km: number;
  status: string;
  color: string;
  line_width: number;
  opacity: number;
}

interface CablePathLayerProps {
  paths: CablePath[];
}

export default function CablePathLayer({ paths }: CablePathLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !paths.length) return;

    const layers: L.Polyline[] = [];

    paths.forEach(path => {
      if (path.polyline && path.polyline.length >= 2) {
        const polyline = L.polyline(path.polyline, {
          color: path.color || '#2196f3',
          weight: path.line_width || 4,
          opacity: path.opacity || 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        });

        // Add tooltip
        polyline.bindTooltip(`
          <div class="p-2 text-sm">
            <b>🔌 OLT → OCC Fiber Cable</b><br/>
            📍 Length: ${path.length_km.toFixed(2)} km<br/>
            🧵 Fiber: ${path.fiber_type}<br/>
            📡 Installation: ${path.cable_type}<br/>
            📊 Status: ${path.status}
          </div>
        `, { sticky: true });

        // Add click handler
        polyline.on('click', () => {
          console.log('Cable path clicked:', path);
        });

        polyline.addTo(map);
        layers.push(polyline);
      }
    });

    return () => {
      layers.forEach(layer => map.removeLayer(layer));
    };
  }, [map, paths]);

  return null;
}