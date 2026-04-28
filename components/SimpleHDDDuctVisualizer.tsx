'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface SimpleHDDDuctVisualizerProps {
  duct: {
    _id: string;
    polyline: [number, number][];
    name: string;
    length_km: number;
    duct_type: string;
    way_count: number;
    status: string;
    color?: string;
  };
  onSelect?: (duct: any) => void;
}

const ductColors: Record<string, string> = {
  HDPE: '#ff9800',
  PVC: '#2196f3',
  Steel: '#9e9e9e',
};

const getLineWidth = (wayCount: number): number => {
  const widths: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 6 };
  return widths[wayCount] || 4;
};

export default function SimpleHDDDuctVisualizer({ duct, onSelect }: SimpleHDDDuctVisualizerProps) {
  const map = useMap();
  const layerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!map || !duct.polyline || duct.polyline.length < 2) return;

    const color = duct.color || ductColors[duct.duct_type] || '#ff9800';
    const weight = getLineWidth(duct.way_count);
    
    const polyline = L.polyline(duct.polyline, {
      color: color,
      weight: weight,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Tooltip
    polyline.bindTooltip(`
      <div class="p-2 text-sm">
        <b>${duct.name}</b><br/>
        📏 ${duct.length_km.toFixed(2)} km<br/>
        🧵 ${duct.way_count}-Way ${duct.duct_type}<br/>
        📊 ${duct.status}
      </div>
    `, { sticky: true });

    // Click handler
    polyline.on('click', () => {
      if (onSelect) onSelect(duct);
    });

    layerRef.current = polyline;

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, duct, onSelect]);

  return null;
}