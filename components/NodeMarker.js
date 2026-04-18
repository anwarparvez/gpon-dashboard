'use client';

import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

export default function NodeMarker({
  node,
  mode,
  selectedNode,
  setSelectedNode,
  selectedNodes,
  setSelectedNodes
}) {

  const isSelected = selectedNode?._id === node._id;

  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width:14px;
        height:14px;
        border-radius:50%;
        background:${node.status === 'existing' ? '#22c55e' : '#f97316'};
        border:2px solid #1f2937;
        box-shadow:${isSelected ? '0 0 10px yellow' : '0 0 2px rgba(0,0,0,0.5)'};
      "></div>
    `
  });

  return (
    <Marker
      position={[node.latitude, node.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {

          // 🔗 LINK MODE
          if (mode === 'link') {
            setSelectedNodes(prev => {
              if (prev.find(n => n._id === node._id)) return prev;
              if (prev.length === 0) return [node];
              if (prev.length === 1) return [prev[0], node];
              return [node];
            });
            return;
          }

          // 📍 NORMAL → OPEN SIDEBAR
          setSelectedNode(node);
        }
      }}
    >
      <Tooltip direction="top">
        {node.node_id} - {node.name}
      </Tooltip>
    </Marker>
  );
}