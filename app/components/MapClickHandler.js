'use client';

import { useMapEvents } from 'react-leaflet';

export default function MapClickHandler({ setDraft, mode }) {
  useMapEvents({
    click(e) {
      console.log("🖱 MAP CLICK:", mode);

      if (mode !== 'add-node') {
        console.log("❌ Not in add-node mode");
        return;
      }

      const newDraft = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        name: '',
        node_category: 'ODP',
        status: 'proposed',
        dgm: 'DGM Phones Secretariate',
        region: 'DTR South'
      };

      console.log("✅ Creating draft:", newDraft);

      setDraft(newDraft);
    }
  });

  return null;
}