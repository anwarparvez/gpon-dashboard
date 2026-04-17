'use client';

import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import DeleteNodeButton from './DeleteNodeButton';

export default function NodeMarker({
  node,
  mode,
  selectedNodes,
  setSelectedNodes,
  setNodes,
  setLinks
}) {

  const selectionIndex = selectedNodes.findIndex(n => n._id === node._id);
  const isSelected = selectionIndex !== -1;

  const getStyle = () => {
    if (selectionIndex === 0) return { color: 'yellow', size: 16 };
    if (selectionIndex === 1) return { color: 'red', size: 16 };

    return {
      color: node.status === 'existing' ? '#22c55e' : '#f97316',
      size: 14
    };
  };

  const style = getStyle();

  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width:${style.size}px;
        height:${style.size}px;
        border-radius:50%;
        background:${style.color};
        border:2px solid #1f2937;
        box-shadow:${isSelected ? '0 0 10px ' + style.color : '0 0 2px rgba(0,0,0,0.5)'};
      "></div>
    `
  });

  return (
    <Marker
      position={[node.latitude, node.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (mode !== 'link') return;

          setSelectedNodes(prev => {
            if (prev.find(n => n._id === node._id)) return prev;
            if (prev.length === 0) return [node];
            if (prev.length === 1) return [prev[0], node];
            return [node];
          });
        }
      }}
    >
      <Tooltip direction="top">
        {node.node_id} - {node.name}
      </Tooltip>

      <Popup>
        <div style={{ minWidth: '220px' }}>
          <b>{node.name}</b>
          <hr />

          <b>ID:</b> {node.node_id} <br />
          <b>Type:</b> {node.node_category} <br />
          <b>Status:</b> {node.status} <br />
          <b>DGM:</b> {node.dgm} <br />
          <b>Region:</b> {node.region} <br />

          <hr />

          <b>Lat:</b> {node.latitude?.toFixed(5)} <br />
          <b>Lng:</b> {node.longitude?.toFixed(5)}

          {/* ✅ CLEAN DELETE COMPONENT */}
          <DeleteNodeButton
            node={node}
            setNodes={setNodes}
            setLinks={setLinks}
          />


          
        </div>
      </Popup>
    </Marker>
  );
}