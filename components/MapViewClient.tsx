'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getShortCategoryName } from '@/lib/nodeUtils';

// Dynamically import leaflet and react-leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

import MapClickHandler from './MapClickHandler';
import NodeSidebar from './NodeSidebar';
import LinkSidebar from './LinkSidebar';
import NodeMarker from './NodeMarker';
import LinkLine from './LinkLine';
import LeftSidebar from './LeftSidebar';

// Types
type NodeStatus = 'existing' | 'proposed';
type NodeCategory = 'OLT' | 'OCC' | 'ODP' | 'HODP' | 'Branch Point' | 'Hand Hole' | 'Joint Closure';
type FiberType = 'GPON' | 'SMF' | 'UG' | 'OH';
type LinkStatus = 'active' | 'planned';

type NodeType = { 
  _id: string; 
  latitude: number; 
  longitude: number; 
  node_category: NodeCategory; 
  status: NodeStatus;
  name?: string;
  node_id?: string;
};

type LinkType = { 
  _id: string; 
  from_node: NodeType; 
  to_node: NodeType; 
  fiber_type: FiberType;
  status: LinkStatus 
};

type HDDDuct = {
  _id: string;
  name: string;
  polyline: [number, number][];
  length_km: number;
  way_count: number;
  duct_size_mm: number;
  duct_type: string;
  fiber_core: number;
  color: string;
  line_width: number;
  opacity: number;
  status: string;
};

const CATEGORY_LIST: NodeCategory[] = ['OLT', 'OCC', 'ODP', 'HODP', 'Branch Point', 'Hand Hole', 'Joint Closure'];
const FIBER_TYPES: FiberType[] = ['GPON', 'SMF', 'UG', 'OH'];

// HDD Duct colors based on way count
const HDD_COLORS: Record<number, string> = {
  1: '#4caf50',  // Green for 1-way
  2: '#2196f3',  // Blue for 2-way
  3: '#ff9800',  // Orange for 3-way
  4: '#f44336',  // Red for 4-way
  6: '#9c27b0',  // Purple for 6-way
  8: '#00bcd4',  // Cyan for 8-way
  12: '#795548', // Brown for 12-way
};

export default function MapViewClient() {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [hddDucts, setHddDucts] = useState<HDDDuct[]>([]);
  const [draftNode, setDraftNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<NodeType[]>([]);
  const [mode, setMode] = useState('add-node');
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [showHddDucts, setShowHddDucts] = useState(true);

  const [filters, setFilters] = useState({
    status: { existing: true, proposed: true },
    category: Object.fromEntries(CATEGORY_LIST.map(c => [c, true])) as Record<NodeCategory, boolean>,
    link: {
      show: true,
      status: { active: true, planned: true },
      fiber_type: { GPON: true, SMF: true, UG: true, OH: true } as Record<FiberType, boolean>
    }
  });

  // Load leaflet dynamically
  useEffect(() => {
    import('leaflet').then(L => {
      // Fix default icon images
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setLeafletLoaded(true);
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [nodesRes, linksRes, hddRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/links'),
        fetch('/api/hdd-ducts')
      ]);
      
      const nodesData = await nodesRes.json();
      const linksData = await linksRes.json();
      const hddData = await hddRes.json();
      
      setNodes(Array.isArray(nodesData) ? nodesData : []);
      setLinks(Array.isArray(linksData) ? linksData : []);
      setHddDucts(Array.isArray(hddData) ? hddData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const filteredNodes = useMemo(() => 
    nodes.filter(node => 
      filters.status[node.status] && 
      filters.category[node.node_category]
    ), [nodes, filters]);

  const filteredLinks = useMemo(() => 
    links.filter(link => {
      if (!filters.link.show) return false;
      const { from_node: from, to_node: to } = link;
      if (!from || !to) return false;
      return filters.status[from.status] && 
             filters.status[to.status] &&
             filters.link.status[link.status] && 
             filters.link.fiber_type[link.fiber_type];
    }), [links, filters]);

  if (!mounted || !leafletLoaded) return <div className="flex h-screen items-center justify-center">Loading map…</div>;

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
      <Card className="absolute top-[80px] left-[240px] z-[1000] w-[280px] shadow-lg">
        <CardContent className="p-4 space-y-4 text-sm">
          {/* STATUS */}
          <div>
            <div className="font-semibold mb-2 text-base">Status</div>
            <div className="space-y-1">
              {(Object.keys(filters.status) as NodeStatus[]).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${key}`}
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
                  <label htmlFor={`status-${key}`} className="capitalize cursor-pointer">
                    {key}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* CATEGORY */}
          <div>
            <div className="font-semibold mb-2 text-base">Category</div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {CATEGORY_LIST.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat}`}
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
                  <label htmlFor={`cat-${cat}`} className="cursor-pointer">
                    {getShortCategoryName(cat)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* LINK FILTER */}
          <div>
            <div className="font-semibold mb-2 text-base">Links</div>
            
            {/* SHOW LINKS */}
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="show-links"
                checked={filters.link.show}
                onCheckedChange={() =>
                  setFilters(prev => ({
                    ...prev,
                    link: { ...prev.link, show: !prev.link.show }
                  }))
                }
              />
              <label htmlFor="show-links" className="cursor-pointer font-medium">
                Show Links
              </label>
            </div>

            {/* LINK STATUS */}
            <div className="ml-2 mb-3">
              <div className="text-xs text-gray-500 mb-1">Link Status</div>
              <div className="space-y-1">
                {(['active', 'planned'] as const).map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox
                      id={`link-status-${s}`}
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
                    <label htmlFor={`link-status-${s}`} className="capitalize cursor-pointer text-sm">
                      {s}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* FIBER TYPE */}
            <div className="ml-2">
              <div className="text-xs text-gray-500 mb-1">Fiber Type</div>
              <div className="space-y-1">
                {FIBER_TYPES.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`fiber-type-${type}`}
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
                    <label htmlFor={`fiber-type-${type}`} className="cursor-pointer text-sm">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* HDD DUCTS TOGGLE */}
            <div className="mt-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-hdd-ducts"
                  checked={showHddDucts}
                  onCheckedChange={() => setShowHddDucts(!showHddDucts)}
                />
                <label htmlFor="show-hdd-ducts" className="cursor-pointer font-medium">
                  🛠️ Show HDD Ducts
                </label>
              </div>
              {hddDucts.length > 0 && (
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  {hddDucts.length} ducts, {(hddDucts.reduce((sum, d) => sum + d.length_km, 0)).toFixed(2)} km total
                </p>
              )}
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

          {/* HDD Ducts */}
          {showHddDucts && hddDucts.map(duct => {
            const positions = duct.polyline;
            if (!positions || positions.length < 2) return null;
            
            const color = duct.color || HDD_COLORS[duct.way_count] || '#ff9800';
            const weight = duct.line_width || Math.min(duct.way_count + 2, 8);
            
            return (
              <Polyline
                key={duct._id}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: weight,
                  opacity: duct.opacity || 0.9,
                  dashArray: '8, 4', // Dashed line for HDD ducts
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: () => {
                    // Optional: Show duct details
                    console.log('HDD Duct clicked:', duct.name);
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* HDD Ducts Legend */}
      {showHddDucts && hddDucts.length > 0 && (
        <Card className="absolute bottom-4 right-4 z-[1000] w-56 shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <CardContent className="p-3">
            <h4 className="text-sm font-semibold mb-2">HDD Duct Legend</h4>
            <div className="space-y-1.5">
              {Object.entries(HDD_COLORS).map(([ways, color]) => {
                const count = hddDucts.filter(d => d.way_count === parseInt(ways)).length;
                if (count === 0) return null;
                return (
                  <div key={ways} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-0.5 rounded-full" 
                        style={{ 
                          backgroundColor: color,
                          height: `${Math.min(parseInt(ways) + 2, 6)}px`
                        }} 
                      />
                      <span>{ways}-Way Duct</span>
                    </div>
                    <span className="text-muted-foreground">{count} ducts</span>
                  </div>
                );
              })}
              <div className="pt-1 border-t mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Total Length:</span>
                  <span className="font-mono">{hddDucts.reduce((sum, d) => sum + d.length_km, 0).toFixed(2)} km</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Total Fibers:</span>
                  <span className="font-mono">{hddDucts.reduce((sum, d) => sum + (d.length_km * d.fiber_core), 0).toFixed(0)} km</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}