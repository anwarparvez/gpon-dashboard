'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

import MapClickHandler from './MapClickHandler';
import NodeSidebar from './NodeSidebar';
import LinkSidebar from './LinkSidebar';
import NodeMarker from './NodeMarker';
import LinkLine from './LinkLine';
import LeftSidebar from './LeftSidebar';

export default function MapView() {

  const [mounted, setMounted] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  const [draftNode, setDraftNode] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);

  const [mode, setMode] = useState('add-node');
  const [sidebarWidth, setSidebarWidth] = useState(220);

  // ✅ FILTER STATES
  const [showExisting, setShowExisting] = useState(true);
  const [showProposed, setShowProposed] = useState(true);

  const [showOLT, setShowOLT] = useState(true);
  const [showOCC, setShowOCC] = useState(true);
  const [showODP, setShowODP] = useState(true);
  const [showHODP, setShowHODP] = useState(true);
  const [showBranch, setShowBranch] = useState(true);

  useEffect(() => {
    setMounted(true);

    fetch('/api/nodes')
      .then(r => r.json())
      .then(data => setNodes(Array.isArray(data) ? data : []));

    fetch('/api/links')
      .then(r => r.json())
      .then(data => setLinks(Array.isArray(data) ? data : []));
  }, []);

  // ✅ FILTER NODES
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {

      // Status
      if (node.status === 'existing' && !showExisting) return false;
      if (node.status === 'proposed' && !showProposed) return false;

      // Category
      if (node.node_category === 'OLT' && !showOLT) return false;
      if (node.node_category === 'OCC' && !showOCC) return false;
      if (node.node_category === 'ODP' && !showODP) return false;
      if (node.node_category === 'HODP' && !showHODP) return false;
      if (node.node_category === 'Branch Point' && !showBranch) return false;

      return true;
    });
  }, [nodes, showExisting, showProposed, showOLT, showOCC, showODP, showHODP, showBranch]);

  // ✅ FILTER LINKS
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const from = link.from_node;
      const to = link.to_node;

      if (!from || !to) return false;

      // existing
      if (!showExisting && from.status === 'existing' && to.status === 'existing') return false;

      // proposed
      if (!showProposed && (from.status === 'proposed' || to.status === 'proposed')) return false;

      return true;
    });
  }, [links, showExisting, showProposed]);

  if (!mounted) return null;

  return (
    <>
      <LeftSidebar mode={mode} setMode={setMode} setSidebarWidth={setSidebarWidth} />

      {/* RIGHT SIDEBAR */}
      <NodeSidebar
        draft={draftNode}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        setDraft={setDraftNode}
        setNodes={setNodes}
        setLinks={setLinks}
      />

      <LinkSidebar
        selectedNodes={selectedNodes}
        setSelectedNodes={setSelectedNodes}
        setLinks={setLinks}
      />

      {/* 🎛️ FILTER PANEL */}
      <div className="absolute top-[80px] left-[240px] z-[1000] bg-white p-3 rounded shadow text-sm space-y-2">

        <div className="font-semibold">Status</div>
        <label><input type="checkbox" checked={showExisting} onChange={() => setShowExisting(!showExisting)} /> Existing</label>
        <label><input type="checkbox" checked={showProposed} onChange={() => setShowProposed(!showProposed)} /> Proposed</label>

        <hr />

        <div className="font-semibold">Category</div>
        <label><input type="checkbox" checked={showOLT} onChange={() => setShowOLT(!showOLT)} /> OLT</label>
        <label><input type="checkbox" checked={showOCC} onChange={() => setShowOCC(!showOCC)} /> OCC</label>
        <label><input type="checkbox" checked={showODP} onChange={() => setShowODP(!showODP)} /> ODP</label>
        <label><input type="checkbox" checked={showHODP} onChange={() => setShowHODP(!showHODP)} /> HODP</label>
        <label><input type="checkbox" checked={showBranch} onChange={() => setShowBranch(!showBranch)} /> Branch</label>

      </div>

      {/* MAP */}
      <div
        className="absolute top-[60px]"
        style={{
          left: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
          height: 'calc(100vh - 60px)'
        }}
      >
        <MapContainer center={[23.73, 90.41]} zoom={13} className="h-full w-full">

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapClickHandler
            setDraft={setDraftNode}
            setSelectedNode={setSelectedNode}
            setSelectedNodes={setSelectedNodes}
            mode={mode}
          />

          {/* Draft Preview */}
          {draftNode && !draftNode.isEdit && (
            <Marker
              position={[draftNode.latitude, draftNode.longitude]}
              icon={L.divIcon({
                html: `<div style="width:16px;height:16px;border-radius:50%;background:yellow;border:2px solid black;"></div>`
              })}
            />
          )}

          {/* FILTERED NODES */}
          {filteredNodes.map(node => (
            <NodeMarker
              key={node._id}
              node={node}
              mode={mode}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              selectedNodes={selectedNodes}
              setSelectedNodes={setSelectedNodes}
            />
          ))}

          {/* FILTERED LINKS */}
          {filteredLinks.map(link => (
            <LinkLine key={link._id} link={link} />
          ))}

        </MapContainer>
      </div>
    </>
  );
}