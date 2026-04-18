'use client';

import { useMapEvents } from 'react-leaflet';

export default function MapClickHandler({
  setDraft,
  setSelectedNode,
  setSelectedNodes,
  mode
}) {

  useMapEvents({
    click(e) {

      // clear selections
      setSelectedNode(null);
      setSelectedNodes([]);

      if (mode !== 'add-node') return;

      setDraft({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        name: '',
        node_category: 'ODP',
        status: 'proposed',
        dgm: 'DGM Phones Secretariate',
        region: 'DTR South'
      });
    }
  });

  return null;
}