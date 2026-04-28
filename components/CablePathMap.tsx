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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

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
  fiber_core: number;
  length_km: number;
  status: string;
  color: string;
  line_width: number;
  opacity: number;
  notes?: string;
  is_hdd?: boolean;
  hdd_details?: {
    way_count: number;
    duct_size_mm: number;
    duct_type: string;
    fiber_core: number;
    entry_pit_depth: number;
    exit_pit_depth: number;
  };
};

type HDDDuct = {
  _id: string;
  name: string;
  path_points: number[][];
  polyline: [number, number][];
  length_km: number;
  way_count: number;
  duct_size_mm: number;
  duct_type: string;
  fiber_core: number;
  entry_pit_depth_m: number;
  exit_pit_depth_m: number;
  color: string;
  line_width: number;
  opacity: number;
  status: string;
  area?: string;
  road_name?: string;
  notes?: string;
  createdAt?: string;
};

const NODE_CATEGORIES = ['OLT', 'OCC', 'ODP', 'HODP', 'Branch Point', 'Hand Hole', 'Joint Closure'];

// Fiber core options
const FIBER_CORE_OPTIONS = [2, 4, 6, 8, 12, 24, 48, 96, 144];

// Helper function to safely convert coordinates to Leaflet format
const toLeafletPositions = (coords: number[][] | undefined): [number, number][] => {
  if (!coords || !Array.isArray(coords) || coords.length < 2) {
    return [];
  }
  return coords.map(coord => {
    if (coord.length >= 2) {
      return [coord[1], coord[0]] as [number, number];
    }
    return [0, 0] as [number, number];
  });
};

export default function CablePathMap() {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [cablePaths, setCablePaths] = useState<CablePath[]>([]);
  const [hddDucts, setHddDucts] = useState<HDDDuct[]>([]);
  const [selectedFromNode, setSelectedFromNode] = useState<string>('');
  const [selectedToNode, setSelectedToNode] = useState<string>('');
  const [drawingMode, setDrawingMode] = useState<'view' | 'draw' | 'hdd'>('view');
  const [pathPoints, setPathPoints] = useState<number[][]>([]);
  const [selectedPath, setSelectedPath] = useState<CablePath | null>(null);
  const [selectedHDDDuct, setSelectedHDDDuct] = useState<HDDDuct | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // HDD Dialog state
  const [showHDDDialog, setShowHDDDialog] = useState(false);
  const [hddConfig, setHddConfig] = useState({
    way_count: 1,
    duct_size_mm: 40,
    duct_type: 'HDPE',
    fiber_core: 24,
    entry_pit_depth: 1.5,
    exit_pit_depth: 1.5,
    area: '',
    road_name: '',
  });
  
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
      fetchHDDDucts();
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

  const fetchHDDDucts = async () => {
    try {
      const res = await fetch('/api/hdd-ducts');
      if (!res.ok) {
        console.error('Failed to fetch HDD ducts:', res.status);
        setHddDucts([]);
        return;
      }
      const text = await res.text();
      if (!text) {
        setHddDucts([]);
        return;
      }
      const data = JSON.parse(text);
      setHddDucts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch HDD ducts:', error);
      setHddDucts([]);
    }
  };

  const calculateLength = (points: number[][]): number => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [lng1, lat1] = points[i - 1];
      const [lng2, lat2] = points[i];
      total += haversineDistance(lat1, lng1, lat2, lng2);
    }
    return total;
  };

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleDrawCreated = (e: any) => {
    const layer = e.layer;
    if (layer && layer.getLatLngs) {
      const latlngs = layer.getLatLngs();
      const points = latlngs.map((ll: any) => [ll.lng, ll.lat]);
      setPathPoints(points);
      
      if (drawingMode === 'hdd') {
        setShowHDDDialog(true);
      } else {
        setMessage({ type: 'success', text: 'Path drawn! Click "Save Cable Path" to store it.' });
      }
      setDrawingMode('view');
    }
  };

  const saveHDDCablePath = async () => {
    if (pathPoints.length < 2) {
      setMessage({ type: 'error', text: 'Please draw a path on the map using the draw tool' });
      return;
    }
    
    const lengthKm = calculateLength(pathPoints);
    
    const hddColors: Record<number, string> = {
      1: '#4caf50',
      2: '#2196f3',
      3: '#ff9800',
      4: '#f44336',
    };
    
    try {
      const res = await fetch('/api/hdd-ducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `HDD-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
          path_points: pathPoints,
          polyline: pathPoints.map(p => [p[1], p[0]]),
          length_km: lengthKm,
          way_count: hddConfig.way_count,
          duct_size_mm: hddConfig.duct_size_mm,
          duct_type: hddConfig.duct_type,
          fiber_core: hddConfig.fiber_core,
          entry_pit_depth_m: hddConfig.entry_pit_depth,
          exit_pit_depth_m: hddConfig.exit_pit_depth,
          area: hddConfig.area,
          road_name: hddConfig.road_name,
          color: hddColors[hddConfig.way_count] || '#ff9800',
          line_width: hddConfig.way_count + 2,
          status: 'planned',
          notes: `${hddConfig.way_count}-Way ${hddConfig.duct_size_mm}mm ${hddConfig.duct_type} HDD Duct, ${hddConfig.fiber_core} fibers`,
        }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `HDD Duct saved! Length: ${lengthKm.toFixed(3)} km, ${hddConfig.way_count}-Way, ${hddConfig.fiber_core} fibers` });
        fetchHDDDucts();
        resetForm();
        setShowHDDDialog(false);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save HDD duct' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving HDD duct' });
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
    
    const lengthKm = calculateLength(pathPoints);
    
    try {
      const res = await fetch('/api/cable-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_node_id: selectedFromNode,
          to_node_id: selectedToNode,
          path_points: pathPoints,
          polyline: pathPoints.map(p => [p[1], p[0]]),
          cable_type: 'underground',
          fiber_type: 'SMF',
          fiber_core: 24,
          length_km: lengthKm,
          status: 'proposed',
          is_hdd: false,
          color: '#2196f3',
          line_width: 3,
        }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Cable path saved! Length: ${lengthKm.toFixed(3)} km` });
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

  const deleteHDDDuct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this HDD duct?')) return;
    
    try {
      const res = await fetch(`/api/hdd-ducts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'HDD duct deleted' });
        fetchHDDDucts();
        if (selectedHDDDuct?._id === id) setSelectedHDDDuct(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete HDD duct' });
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

  const getPathStyle = (path: CablePath) => {
    if (path.is_hdd) {
      const wayCount = path.hdd_details?.way_count || 1;
      const hddColors: Record<number, string> = { 1: '#4caf50', 2: '#2196f3', 3: '#ff9800', 4: '#f44336' };
      return {
        color: path.color || hddColors[wayCount] || '#ff9800',
        weight: path.line_width || wayCount + 2,
        opacity: path.opacity || 0.9,
        dashArray: '8, 4',
      };
    }
    return {
      color: path.color || '#2196f3',
      weight: path.line_width || 3,
      opacity: path.opacity || 0.8,
    };
  };

  const getHDDStyle = (duct: HDDDuct) => {
    const hddColors: Record<number, string> = {
      1: '#4caf50',
      2: '#2196f3',
      3: '#ff9800',
      4: '#f44336',
    };
    return {
      color: duct.color || hddColors[duct.way_count] || '#ff9800',
      weight: duct.line_width || duct.way_count + 2,
      opacity: duct.opacity || 0.9,
      dashArray: '8, 4',
    };
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
          <h2 className="text-xl font-bold mb-2">Cable & Duct Designer</h2>
          <p className="text-sm text-muted-foreground">Draw fiber cables (OLT→OCC) or HDD ducts</p>
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

        {/* Node Selection (Only for Cable) */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Nodes (For Cable)</CardTitle>
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
              <Button variant={drawingMode === 'draw' ? 'default' : 'outline'} onClick={() => setDrawingMode('draw')} className="flex-1" disabled={!selectedFromNode || !selectedToNode}>✏️ Draw Cable</Button>
              <Button variant={drawingMode === 'hdd' ? 'destructive' : 'outline'} onClick={() => setDrawingMode('hdd')} className="flex-1">🛠️ HDD Duct</Button>
            </div>
            {drawingMode === 'draw' && (<div className="text-sm text-muted-foreground bg-muted p-2 rounded">💡 Select OLT and OCC first, then draw cable path. Double-click to finish.</div>)}
            {drawingMode === 'hdd' && (<div className="text-sm text-muted-foreground bg-orange-100 dark:bg-orange-950 p-2 rounded">🛠️ HDD Mode: Draw duct path anywhere. Double-click to finish.</div>)}
            {pathPoints.length > 0 && (<div className="text-xs text-muted-foreground">Path points: {pathPoints.length} | Length: {calculateLength(pathPoints).toFixed(3)} km</div>)}
          </CardContent>
        </Card>

        {/* Save Buttons */}
        {(pathPoints.length > 0 && drawingMode === 'draw' && selectedFromNode && selectedToNode) && (<Button onClick={saveCablePath} className="w-full">💾 Save Cable Path</Button>)}
        {(pathPoints.length > 0 && drawingMode === 'hdd') && (<Button onClick={() => setShowHDDDialog(true)} className="w-full bg-orange-600 hover:bg-orange-700">🛠️ Configure & Save HDD Duct</Button>)}

        {/* Existing Cable Paths */}
        {cablePaths.length > 0 && (
          <Card>
            <CardHeader><CardTitle>3. Existing Cable Paths</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {cablePaths.filter(p => p.from_node_category === 'OLT' && p.to_node_category === 'OCC').map(path => (
                <div key={path._id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPath?._id === path._id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`} onClick={() => setSelectedPath(path)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-bold">{path.from_node_id} → {path.to_node_id}</p>
                        {path.is_hdd && <Badge className="bg-orange-500 text-xs">HDD</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{path.length_km.toFixed(3)} km</p>
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

        {/* Existing HDD Ducts */}
        {hddDucts.length > 0 && (
          <Card>
            <CardHeader><CardTitle>4. Existing HDD Ducts</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {hddDucts.map(duct => (
                <div key={duct._id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedHDDDuct?._id === duct._id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`} onClick={() => setSelectedHDDDuct(duct)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-bold">{duct.name}</p>
                        <Badge className="bg-orange-500 text-xs">{duct.way_count}-Way</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{duct.length_km.toFixed(3)} km</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{duct.duct_size_mm}mm</Badge>
                        <Badge variant="outline" className="text-xs">{duct.duct_type}</Badge>
                        <Badge variant="secondary" className="text-xs">{duct.fiber_core} fibers</Badge>
                        <Badge className="text-xs">{duct.status}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); deleteHDDDuct(duct._id); }}>🗑️</Button>
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
            {(drawingMode === 'draw' || drawingMode === 'hdd') && (
              <EditControl 
                position="topleft" 
                onCreated={handleDrawCreated} 
                draw={{ 
                  rectangle: false, 
                  circle: false, 
                  circlemarker: false, 
                  marker: false, 
                  polygon: false, 
                  polyline: { 
                    shapeOptions: { 
                      color: drawingMode === 'hdd' ? '#ff9800' : '#2196f3', 
                      weight: drawingMode === 'hdd' ? 5 : 4, 
                      opacity: 0.8 
                    } 
                  } 
                }} 
              />
            )}
          </FeatureGroup>
          
          {/* Render existing cable paths - FIXED with type assertion */}
          {cablePaths && cablePaths.length > 0 && cablePaths.map(path => {
            const positions = toLeafletPositions(path.polyline || path.path_points);
            if (positions.length < 2) return null;
            const style = getPathStyle(path);
            return (<Polyline key={path._id} positions={positions} pathOptions={style} eventHandlers={{ click: () => setSelectedPath(path) }} />);
          })}
          
          {/* Render HDD ducts - FIXED with type assertion */}
          {hddDucts && hddDucts.length > 0 && hddDucts.map(duct => {
            const positions = toLeafletPositions(duct.polyline);
            if (positions.length < 2) return null;
            const style = getHDDStyle(duct);
            return (<Polyline key={duct._id} positions={positions} pathOptions={style} eventHandlers={{ click: () => setSelectedHDDDuct(duct) }} />);
          })}
          
          {/* Render filtered nodes */}
          {filteredNodes.map(node => (
            <Marker key={node._id} position={[node.latitude, node.longitude]} icon={L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${getNodeColor(node.node_category)}; width: ${node.node_category === 'OLT' || node.node_category === 'OCC' ? '14px' : '10px'}; height: ${node.node_category === 'OLT' || node.node_category === 'OCC' ? '14px' : '10px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`, iconSize: [node.node_category === 'OLT' || node.node_category === 'OCC' ? 14 : 10, node.node_category === 'OLT' || node.node_category === 'OCC' ? 14 : 10] })}>
              <Popup><div className="text-sm"><strong>{node.node_id}</strong><br />{node.name}<br />Category: {node.node_category}<br />Status: {node.status}</div></Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Path Details Panel for Cable */}
        {selectedPath && (
          <Card className="absolute bottom-4 right-4 w-80 shadow-lg">
            <CardHeader className="pb-2"><div className="flex justify-between items-center"><CardTitle className="text-sm">Cable Details</CardTitle><Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)}>✕</Button></div></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>From:</strong> {selectedPath.from_node_id}</p>
              <p><strong>To:</strong> {selectedPath.to_node_id}</p>
              <p><strong>Length:</strong> {selectedPath.length_km.toFixed(3)} km</p>
              <p><strong>Fiber Type:</strong> {selectedPath.fiber_type}</p>
              <p><strong>Cable Type:</strong> {selectedPath.cable_type}</p>
              <p><strong>Status:</strong> <Badge>{selectedPath.status}</Badge></p>
            </CardContent>
          </Card>
        )}
        
        {/* Path Details Panel for HDD Duct */}
        {selectedHDDDuct && (
          <Card className="absolute bottom-4 right-4 w-80 shadow-lg">
            <CardHeader className="pb-2"><div className="flex justify-between items-center"><CardTitle className="text-sm">HDD Duct Details</CardTitle><Button variant="ghost" size="sm" onClick={() => setSelectedHDDDuct(null)}>✕</Button></div></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Name:</strong> {selectedHDDDuct.name}</p>
              <p><strong>Length:</strong> {selectedHDDDuct.length_km.toFixed(3)} km</p>
              <p><strong>Ways:</strong> {selectedHDDDuct.way_count}-Way</p>
              <p><strong>Duct Size:</strong> {selectedHDDDuct.duct_size_mm}mm</p>
              <p><strong>Duct Type:</strong> {selectedHDDDuct.duct_type}</p>
              <p><strong>Fiber Core:</strong> {selectedHDDDuct.fiber_core} fibers</p>
              <p><strong>Entry Pit:</strong> {selectedHDDDuct.entry_pit_depth_m}m</p>
              <p><strong>Exit Pit:</strong> {selectedHDDDuct.exit_pit_depth_m}m</p>
              {selectedHDDDuct.area && <p><strong>Area:</strong> {selectedHDDDuct.area}</p>}
              {selectedHDDDuct.road_name && <p><strong>Road:</strong> {selectedHDDDuct.road_name}</p>}
              <p><strong>Status:</strong> <Badge>{selectedHDDDuct.status}</Badge></p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* HDD Configuration Dialog */}
      <Dialog open={showHDDDialog} onOpenChange={setShowHDDDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🛠️ HDD Duct Configuration</DialogTitle>
            <DialogDescription>
              Configure the horizontal directional drilling duct parameters including fiber core count.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number of Ways</Label>
                <Select value={hddConfig.way_count.toString()} onValueChange={(v) => setHddConfig({...hddConfig, way_count: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-Way</SelectItem>
                    <SelectItem value="2">2-Way</SelectItem>
                    <SelectItem value="3">3-Way</SelectItem>
                    <SelectItem value="4">4-Way</SelectItem>
                    <SelectItem value="6">6-Way</SelectItem>
                    <SelectItem value="8">8-Way</SelectItem>
                    <SelectItem value="12">12-Way</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duct Size (mm)</Label>
                <Select value={hddConfig.duct_size_mm.toString()} onValueChange={(v) => setHddConfig({...hddConfig, duct_size_mm: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32">32mm</SelectItem>
                    <SelectItem value="40">40mm</SelectItem>
                    <SelectItem value="50">50mm</SelectItem>
                    <SelectItem value="63">63mm</SelectItem>
                    <SelectItem value="75">75mm</SelectItem>
                    <SelectItem value="90">90mm</SelectItem>
                    <SelectItem value="110">110mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duct Type</Label>
                <Select value={hddConfig.duct_type} onValueChange={(v) => setHddConfig({...hddConfig, duct_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HDPE">HDPE</SelectItem>
                    <SelectItem value="PVC">PVC</SelectItem>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Fiberglass">Fiberglass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fiber Core Count</Label>
                <Select value={hddConfig.fiber_core.toString()} onValueChange={(v) => setHddConfig({...hddConfig, fiber_core: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIBER_CORE_OPTIONS.map(core => (
                      <SelectItem key={core} value={core.toString()}>{core} fibers</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entry Pit Depth (m)</Label>
                <Input type="number" step="0.1" value={hddConfig.entry_pit_depth} onChange={(e) => setHddConfig({...hddConfig, entry_pit_depth: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Exit Pit Depth (m)</Label>
                <Input type="number" step="0.1" value={hddConfig.exit_pit_depth} onChange={(e) => setHddConfig({...hddConfig, exit_pit_depth: parseFloat(e.target.value)})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Area/Location (Optional)</Label>
                <Input placeholder="e.g., Downtown" value={hddConfig.area} onChange={(e) => setHddConfig({...hddConfig, area: e.target.value})} />
              </div>
              <div>
                <Label>Road Name (Optional)</Label>
                <Input placeholder="e.g., Main Street" value={hddConfig.road_name} onChange={(e) => setHddConfig({...hddConfig, road_name: e.target.value})} />
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Path Length:</span>
                <span className="font-bold">{calculateLength(pathPoints).toFixed(3)} km</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total Fibers:</span>
                <span className="font-bold">{hddConfig.fiber_core} cores</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Est. Capacity:</span>
                <span>{hddConfig.fiber_core} Gbps (theoretical)</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowHDDDialog(false);
              resetForm();
            }}>Cancel</Button>
            <Button onClick={saveHDDCablePath}>Save HDD Duct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}