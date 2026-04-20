'use client';

import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  Server,     // OLT
  Package,    // OCC
  MapPin,     // ODP
  Home,       // HODP
  GitBranch   // Branch
} from 'lucide-react';

export default function NodeMarker({
  node,
  mode,
  selectedNode,
  setSelectedNode,
  selectedNodes,
  setSelectedNodes
}) {

  const isSelected = selectedNode?._id === node._id;

  // 🎯 Color by NODE TYPE
  const getColor = () => {
    switch (node.node_category) {
      case 'OLT':
        return '#7c3aed'; // purple
      case 'OCC':
        return '#2563eb'; // blue
      case 'ODP':
        return '#16a34a'; // green
      case 'HODP':
        return '#ea580c'; // orange
      case 'Branch Point':
        return '#374151'; // gray
      default:
        return '#6b7280';
    }
  };

  // 🎯 Icon by type
  const getIcon = () => {
    switch (node.node_category) {
      case 'OLT':
        return <Server size={12} />;
      case 'OCC':
        return <Package size={12} />;
      case 'ODP':
        return <MapPin size={12} />;
      case 'HODP':
        return <Home size={12} />;
      case 'Branch Point':
        return <GitBranch size={12} />;
      default:
        return <MapPin size={12} />;
    }
  };

  const iconHtml = renderToStaticMarkup(
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #111',

        // subtle highlight when selected
        boxShadow: isSelected
          ? '0 0 6px yellow'
          : '0 0 2px rgba(0,0,0,0.4)'
      }}
    >
      {getIcon()}
    </div>
  );

  const icon = L.divIcon({
    className: '',
    html: iconHtml,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <Marker
      position={[node.latitude, node.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {

          if (mode === 'link') {
            setSelectedNodes(prev => {
              if (prev.find(n => n._id === node._id)) return prev;
              if (prev.length === 0) return [node];
              if (prev.length === 1) return [prev[0], node];
              return [node];
            });
            return;
          }

          setSelectedNode(node);
        }
      }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <div>
          <b>{node.node_id}</b><br />
          {node.address}<br />
          {node.node_category}<br />
          
        </div>
      </Tooltip>
    </Marker>
  );
}