'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const FeatureGroup = dynamic(() => import('react-leaflet').then(m => m.FeatureGroup), { ssr: false });
const EditControl = dynamic(() => import('react-leaflet-draw').then(m => m.EditControl), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

type NodeType = {
  _id: string;
  node_id: string;
  name: string;
  node_category: string;
  latitude: number;
  longitude: number;
  status: string;
};

type CablePath = {
  _id: string;
  from_node_id: string;
  to_node_id: string;
  from_node_category: string;
  to_node_category: string;
  path_points: number[][];
  polyline: [number, number][];
  fiber_type: string;
  cable_type: string;
  length_km: number;
  status: string;
  color: string;
  line_width: number;
  opacity: number;
  notes?: string;
};

const NODE_CATEGORIES = ['OLT', 'OCC', 'ODP', 'HODP', 'Branch Point', 'Hand Hole', 'Joint Closure'];

export default function CablePathMap() {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [cablePaths, setCablePaths] = useState<CablePath[]>([]);
  const [selectedFromNode, setSelectedFromNode] = useState<string>('');
  const [selectedToNode, setSelectedToNode] = useState<string>('');
  const [drawingMode, setDrawingMode] = useState<'view' | 'draw'>('view');
  const [pathPoints, setPathPoints] = useState<number[][]>([]);
  const [selectedPath, setSelectedPath] = useState<CablePath | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({
    'OLT': true,
    'OCC': true,
    'ODP': false,
    'HODP': false,
    'Branch Point': false,
    'Hand Hole': false,
    'Joint Closure': false,
  });
  const [statusFilter, setStatusFilter] = useState<{ existing: boolean; proposed: boolean }>({
    existing: true,
    proposed: true,
  });

  const featureGroupRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setLeafletLoaded(true);
    }).catch(err => console.error('Failed to load leaflet:', err));
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchNodes();
      fetchCablePaths();
    }
  }, [mounted]);

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      const data = await res.json();
      setNodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
    }
  };

  const fetchCablePaths = async () => {
    try {
      const res = await fetch('/api/cable-paths');
      if (!res.ok) {
        console.error('Failed to fetch cable paths:', res.status);
        setCablePaths([]);
        return;
      }
      const data = await res.json();
      setCablePaths(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch cable paths:', error);
      setCablePaths([]);
    }
  };

  const handleDrawCreated = (e: any) => {
    const layer = e.layer;
    if (layer && layer.getLatLngs) {
      const latlngs = layer.getLatLngs();
      const points = latlngs.map((ll: any) => [ll.lng, ll.lat]);
      setPathPoints(points);
      setMessage({ type: 'success', text: 'Path drawn! Click "Save Cable Path" to store it.' });
      setDrawingMode('view');
    }
  };

  const saveCablePath = async () => {
    if (!selectedFromNode || !selectedToNode) {
      setMessage({ type: 'error', text: 'Please select both source and destination nodes' });
      return;
    }
    
    if (pathPoints.length < 2) {
      setMessage({ type: 'error', text: 'Please draw a path on the map using the draw tool' });
      return;
    }
    
    try {
      const res = await fetch('/api/cable-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_node_id: selectedFromNode,
          to_node_id: selectedToNode,
          path_points: pathPoints,
          cable_type: 'underground',
          fiber_type: 'SMF',
          fiber_core: 24,
          status: 'proposed',
        }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cable path saved successfully!' });
        fetchCablePaths();
        resetForm();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save cable path' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving cable path' });
    }
  };

  const deleteCablePath = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cable path?')) return;
    
    try {
      const res = await fetch(`/api/cable-paths/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cable path deleted' });
        fetchCablePaths();
        if (selectedPath?._id === id) setSelectedPath(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete cable path' });
    }
  };

  const resetForm = () => {
    setSelectedFromNode('');
    setSelectedToNode('');
    setPathPoints([]);
    setDrawingMode('view');
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  const getNodesByCategory = (category: string) => {
    return nodes.filter(n => n.node_category === category);
  };

  const filteredNodes = nodes.filter(node => {
    const categoryMatch = categoryFilters[node.node_category];
    const statusMatch = statusFilter[node.status as 'existing' | 'proposed'];
    return categoryMatch && statusMatch;
  });

  const olts = getNodesByCategory('OLT');
  const occs = getNodesByCategory('OCC');

  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleStatusFilter = (status: 'existing' | 'proposed') => {
    setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const getNodeColor = (category: string) => {
    const colors: Record<string, string> = {
      'OLT': '#f97316',
      'OCC': '#3b82f6',
      'ODP': '#10b981',
      'HODP': '#8b5cf6',
      'Branch Point': '#ec4898',
      'Hand Hole': '#6b7280',
      'Joint Closure': '#a855f7',
    };
    return colors[category] || '#6b7280';
  };

  if (!mounted || !leafletLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-96 bg-background border-r overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Cable Path Designer</h2>
          <p className="text-sm text-muted-foreground">Draw fiber cable paths between OLTs and OCCs</p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Node Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Nodes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Status</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="status-existing" checked={statusFilter.existing} onCheckedChange={() => toggleStatusFilter('existing')} />
                  <label htmlFor="status-existing" className="cursor-pointer">Existing</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="status-proposed" checked={statusFilter.proposed} onCheckedChange={() => toggleStatusFilter('proposed')} />
                  <label htmlFor="status-proposed" className="cursor-pointer">Proposed</label>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Categories</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {NODE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox id={`cat-${cat}`} checked={categoryFilters[cat]} onCheckedChange={() => toggleCategoryFilter(cat)} />
                    <label htmlFor={`cat-${cat}`} className="cursor-pointer text-sm">
                      {cat} <span className="text-xs text-muted-foreground">({nodes.filter(n => n.node_category === cat).length})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Node Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Nodes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>From (Source OLT)</Label>
              <Select value={selectedFromNode} onValueChange={setSelectedFromNode}>
                <SelectTrigger><SelectValue placeholder="Select OLT" /></SelectTrigger>
                <SelectContent>
                  {olts.filter(olt => categoryFilters['OLT'] && statusFilter[olt.status as 'existing' | 'proposed']).map(olt => (
                    <SelectItem key={olt._id} value={olt.node_id}>{olt.node_id} - {olt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To (Destination OCC)</Label>
              <Select value={selectedToNode} onValueChange={setSelectedToNode}>
                <SelectTrigger><SelectValue placeholder="Select OCC" /></SelectTrigger>
                <SelectContent>
                  {occs.filter(occ => categoryFilters['OCC'] && statusFilter[occ.status as 'existing' | 'proposed']).map(occ => (
                    <SelectItem key={occ._id} value={occ.node_id}>{occ.node_id} - {occ.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Drawing Tools */}
        <Card>
          <CardHeader><CardTitle>2. Draw Path</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant={drawingMode === 'view' ? 'default' : 'outline'} onClick={() => setDrawingMode('view')} className="flex-1">👁️ View</Button>
              <Button variant={drawingMode === 'draw' ? 'default' : 'outline'} onClick={() => setDrawingMode('draw')} className="flex-1" disabled={!selectedFromNode || !selectedToNode}>✏️ Draw Path</Button>
            </div>
            {drawingMode === 'draw' && (<div className="text-sm text-muted-foreground bg-muted p-2 rounded">💡 Click on the map to add path points. Click the last point to finish drawing.</div>)}
            {pathPoints.length > 0 && (<div className="text-xs text-muted-foreground">Path points: {pathPoints.length}</div>)}
          </CardContent>
        </Card>

        {(selectedFromNode && selectedToNode && pathPoints.length > 0) && (<Button onClick={saveCablePath} className="w-full">💾 Save Cable Path</Button>)}

        {/* Existing Paths */}
        {cablePaths.length > 0 && (
          <Card>
            <CardHeader><CardTitle>3. Existing Paths</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {cablePaths.filter(p => p.from_node_category === 'OLT' && p.to_node_category === 'OCC').map(path => (
                <div key={path._id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPath?._id === path._id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`} onClick={() => setSelectedPath(path)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-xs font-bold">{path.from_node_id} → {path.to_node_id}</p>
                      <p className="text-xs text-muted-foreground">{path.length_km.toFixed(2)} km</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{path.fiber_type}</Badge>
                        <Badge variant="outline" className="text-xs">{path.cable_type}</Badge>
                        <Badge className="text-xs">{path.status}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); deleteCablePath(path._id); }}>🗑️</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer center={[23.73, 90.41]} zoom={13} className="h-full w-full" style={{ background: '#f0f0f0' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          <FeatureGroup ref={featureGroupRef}>
            {drawingMode === 'draw' && (
              <EditControl position="topleft" onCreated={handleDrawCreated} draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polygon: false, polyline: { shapeOptions: { color: '#ff9800', weight: 4, opacity: 0.8 } } }} />
            )}
          </FeatureGroup>
          
          {/* Render existing cable paths */}
          {cablePaths && cablePaths.length > 0 && cablePaths.map(path => {
            const coordinates = path.polyline || path.path_points;
            if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) return null;
            const positions = coordinates.map(coord => [coord[1], coord[0]]);
            return (<Polyline key={path._id} positions={positions} pathOptions={{ color: path.color || '#2196f3', weight: path.line_width || 4, opacity: path.opacity || 0.8 }} eventHandlers={{ click: () => setSelectedPath(path) }} />);
          })}
          
          {/* Render filtered nodes */}
          {filteredNodes.map(node => (
            <Marker key={node._id} position={[node.latitude, node.longitude]} icon={L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${getNodeColor(node.node_category)}; width: ${node.node_category === 'OLT' || node.node_category === 'OCC' ? '14px' : '10px'}; height: ${node.node_category === 'OLT' || node.node_category === 'OCC' ? '14px' : '10px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`, iconSize: [node.node_category === 'OLT' || node.node_category === 'OCC' ? 14 : 10, node.node_category === 'OLT' || node.node_category === 'OCC' ? 14 : 10] })}>
              <Popup><div className="text-sm"><strong>{node.node_id}</strong><br />{node.name}<br />Category: {node.node_category}<br />Status: {node.status}</div></Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Path Details Panel */}
        {selectedPath && (
          <Card className="absolute bottom-4 right-4 w-80 shadow-lg">
            <CardHeader className="pb-2"><div className="flex justify-between items-center"><CardTitle className="text-sm">Path Details</CardTitle><Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)}>✕</Button></div></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>From:</strong> {selectedPath.from_node_id}</p>
              <p><strong>To:</strong> {selectedPath.to_node_id}</p>
              <p><strong>Length:</strong> {selectedPath.length_km.toFixed(2)} km</p>
              <p><strong>Fiber Type:</strong> {selectedPath.fiber_type}</p>
              <p><strong>Cable Type:</strong> {selectedPath.cable_type}</p>
              <p><strong>Status:</strong> <Badge>{selectedPath.status}</Badge></p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}