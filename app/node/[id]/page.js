'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// 🔥 Load map without SSR
const MapView = dynamic(() => import('../../components/NodeMapView'), {
  ssr: false
});

export default function NodeDetailPage() {
  const { id } = useParams();
  const [node, setNode] = useState(null);

  useEffect(() => {
    fetch(`/api/nodes`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(n => n._id === id);
        setNode(found);
      });
  }, [id]);

  if (!node) return <p>Loading...</p>;

  return (
    <div className="p-4 bg-gray-900 text-white">

      <h2 className="text-xl mb-4">📍 Node Details</h2>

      {/* Map */}
      <div className="h-[400px] mb-4">
        <MapView node={node} />
      </div>

      {/* Info Panel */}
      <div className="bg-gray-800 p-4 rounded">
        <p><b>ID:</b> {node.node_id}</p>
        <p><b>Name:</b> {node.name}</p>
        <p><b>Category:</b> {node.node_category}</p>
        <p><b>Status:</b> {node.status}</p>
        <p><b>DGM:</b> {node.dgm}</p>
        <p><b>Region:</b> {node.region}</p>
        <p><b>Lat:</b> {node.latitude}</p>
        <p><b>Lon:</b> {node.longitude}</p>
      </div>

    </div>
  );
}