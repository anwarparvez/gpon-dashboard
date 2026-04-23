'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { getShortCategoryName } from '@/lib/nodeUtils';

// Dynamic imports
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

// Components
import MapClickHandler from './MapClickHandler';
import NodeSidebar from './NodeSidebar';
import LinkSidebar from './LinkSidebar';
import NodeMarker from './NodeMarker';
import LinkLine from './LinkLine';
import LeftSidebar from './LeftSidebar';

/* =========================
   TYPES
========================= */
type NodeStatus = 'existing' | 'proposed';

type NodeCategory =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point'
  | 'Hand Hole'
  | 'Joint Closure';

type NodeType = {
  _id: string;
  latitude: number;
  longitude: number;
  node_category: NodeCategory;
  status: NodeStatus;
};

type LinkStatus = 'active' | 'planned';

type LinkType = {
  _id: string;
  from_node: NodeType;
  to_node: NodeType;
  fiber_type: string; // GPON (extensible)
  status: LinkStatus;
};

/* =========================
   CATEGORY LIST
========================= */
const CATEGORY_LIST: NodeCategory[] = [
  'OLT',
  'OCC',
  'ODP',
  'HODP',
  'Branch Point',
  'Hand Hole',
  'Joint Closure'
];

export default function MapView() {

  const [mounted, setMounted] = useState(false);

  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);

  const [draftNode, setDraftNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<NodeType[]>([]);

  const [mode, setMode] = useState('add-node');
  const [sidebarWidth, setSidebarWidth] = useState(220);

  /* =========================
     FILTER STATE
  ========================= */
  const [filters, setFilters] = useState({
    status: {
      existing: true,
      proposed: true
    },
    category: Object.fromEntries(
      CATEGORY_LIST.map(c => [c, true])
    ) as Record<NodeCategory, boolean>,

    link: {
      show: true,
      status: {
        active: true,
        planned: true
      },
      fiber_type: {
        GPON: true
      } as Record<string, boolean>
    }
  });

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    setMounted(true);

    fetch('/api/nodes')
      .then(r => r.json())
      .then(data => setNodes(Array.isArray(data) ? data : []));

    fetch('/api/links')
      .then(r => r.json())
      .then(data => setLinks(Array.isArray(data) ? data : []));
  }, []);

  /* =========================
     FILTER NODES
  ========================= */
  const filteredNodes = useMemo(() => {
    return nodes.filter(node =>
      filters.status[node.status] &&
      filters.category[node.node_category]
    );
  }, [nodes, filters]);

  /* =========================
     FILTER LINKS (UPDATED)
  ========================= */
  const filteredLinks = useMemo(() => {
    return links.filter(link => {

      if (!filters.link.show) return false;

      const from = link.from_node;
      const to = link.to_node;

      if (!from || !to) return false;

      // Node filter
      if (!filters.status[from.status] || !filters.status[to.status]) {
        return false;
      }

      // Link status filter
      if (!filters.link.status[link.status]) {
        return false;
      }

      // Fiber type filter
      if (!filters.link.fiber_type[link.fiber_type]) {
        return false;
      }

      return true;
    });
  }, [links, filters]);

  if (!mounted) return null;

  return (
    <>
      <LeftSidebar mode={mode} setMode={setMode} setSidebarWidth={setSidebarWidth} />

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

      {/* FILTER PANEL */}
      <Card className="absolute top-[80px] left-[240px] z-[1000] w-[250px]">
        <CardContent className="p-3 space-y-4 text-sm">

          {/* STATUS */}
          <div>
            <div className="font-semibold mb-2">Status</div>

            {(Object.keys(filters.status) as NodeStatus[]).map(key => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={filters.status[key]}
                  onCheckedChange={() =>
                    setFilters(prev => ({
                      ...prev,
                      status: {
                        ...prev.status,
                        [key]: !prev.status[key]
                      }
                    }))
                  }
                />
                <span className="capitalize">{key}</span>
              </div>
            ))}
          </div>

          {/* CATEGORY */}
          <div>
            <div className="font-semibold mb-2">Category</div>

            {CATEGORY_LIST.map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <Checkbox
                  checked={filters.category[cat]}
                  onCheckedChange={() =>
                    setFilters(prev => ({
                      ...prev,
                      category: {
                        ...prev.category,
                        [cat]: !prev.category[cat]
                      }
                    }))
                  }
                />
                <span>{getShortCategoryName(cat)}</span>
              </div>
            ))}
          </div>

          {/* LINK FILTER */}
          <div>
            <div className="font-semibold mb-2">Links</div>

            {/* SHOW */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.link.show}
                onCheckedChange={() =>
                  setFilters(prev => ({
                    ...prev,
                    link: { ...prev.link, show: !prev.link.show }
                  }))
                }
              />
              <span>Show Links</span>
            </div>

            {/* STATUS */}
            <div className="mt-2">
              <div className="text-xs text-gray-500">Status</div>

              {(['active', 'planned'] as const).map(s => (
                <div key={s} className="flex items-center gap-2 ml-2">
                  <Checkbox
                    checked={filters.link.status[s]}
                    onCheckedChange={() =>
                      setFilters(prev => ({
                        ...prev,
                        link: {
                          ...prev.link,
                          status: {
                            ...prev.link.status,
                            [s]: !prev.link.status[s]
                          }
                        }
                      }))
                    }
                  />
                  <span>{s}</span>
                </div>
              ))}
            </div>

            {/* FIBER TYPE */}
            <div className="mt-2">
              <div className="text-xs text-gray-500">Fiber</div>

              {['GPON'].map(type => (
                <div key={type} className="flex items-center gap-2 ml-2">
                  <Checkbox
                    checked={filters.link.fiber_type[type]}
                    onCheckedChange={() =>
                      setFilters(prev => ({
                        ...prev,
                        link: {
                          ...prev.link,
                          fiber_type: {
                            ...prev.link.fiber_type,
                            [type]: !prev.link.fiber_type[type]
                          }
                        }
                      }))
                    }
                  />
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

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

          {/* Draft */}
          {draftNode && !draftNode.isEdit && (
            <Marker
              position={[draftNode.latitude, draftNode.longitude]}
              icon={L.divIcon({
                html: `<div style="width:16px;height:16px;border-radius:50%;background:yellow;border:2px solid black;"></div>`
              })}
            />
          )}

          {/* Nodes */}
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

          {/* Links */}
          {filteredLinks.map(link => (
            <LinkLine key={link._id} link={link} setLinks={setLinks} />
          ))}

        </MapContainer>
      </div>
    </>
  );
}