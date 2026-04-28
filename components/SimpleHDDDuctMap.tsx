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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

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

const FIBER_CORE_OPTIONS = [2, 4, 6, 8, 12, 24, 48, 96, 144];
const DUCT_SIZE_OPTIONS = [32, 40, 50, 63, 75, 90, 110];
const DUCT_TYPE_OPTIONS = ['HDPE', 'PVC', 'Steel', 'Fiberglass'];
const STATUS_OPTIONS = ['planned', 'in_progress', 'completed', 'blocked', 'cancelled'];

export default function SimpleHDDDuctMap() {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [ducts, setDucts] = useState<HDDDuct[]>([]);
  const [drawingMode, setDrawingMode] = useState<'off' | 'drawing'>('off');
  const [pathPoints, setPathPoints] = useState<number[][]>([]);
  const [tempLine, setTempLine] = useState<L.Polyline | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [selectedDuct, setSelectedDuct] = useState<HDDDuct | null>(null);
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
    notes: '',
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
      fetchDucts();
    }
  }, [mounted]);

  const fetchDucts = async () => {
    try {
      const res = await fetch('/api/hdd-ducts');
      if (!res.ok) {
        console.error('Failed to fetch HDD ducts:', res.status);
        setDucts([]);
        return;
      }
      const data = await res.json();
      setDucts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch HDD ducts:', error);
      setDucts([]);
    }
  };

  const calculateLength = (points: [number, number][]): number => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += haversineDistance(points[i-1][0], points[i-1][1], points[i][0], points[i][1]);
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

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (drawingMode !== 'drawing') return;
    
    const { lat, lng } = e.latlng;
    const newPoint: [number, number] = [lat, lng];
    const newPoints = [...pathPoints, newPoint];
    setPathPoints(newPoints);
    
    // Add marker
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'waypoint',
        html: `<div class="w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow"></div>`,
        iconSize: [12, 12],
      }),
    }).addTo(map);
    
    setMarkers(prev => [...prev, marker]);
    
    // Update temporary line
    if (tempLine) map.removeLayer(tempLine);
    
    const newTempLine = L.polyline(newPoints, {
      color: '#ff9800',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 4',
    }).addTo(map);
    
    setTempLine(newTempLine);
  };

  const handleDoubleClick = () => {
    if (drawingMode !== 'drawing' || pathPoints.length < 2) return;
    
    // Clean up temp line and markers
    if (tempLine) {
      const map = tempLine._map;
      if (map) map.removeLayer(tempLine);
    }
    markers.forEach(marker => {
      const map = marker._map;
      if (map) map.removeLayer(marker);
    });
    
    setShowHDDDialog(true);
  };

  const saveHDDDuct = async () => {
    if (pathPoints.length < 2) {
      setMessage({ type: 'error', text: 'Please draw a path on the map' });
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
          path_points: pathPoints.map(p => [p[1], p[0]]),
          polyline: pathPoints,
          length_km: lengthKm,
          way_count: hddConfig.way_count,
          duct_size_mm: hddConfig.duct_size_mm,
          duct_type: hddConfig.duct_type,
          fiber_core: hddConfig.fiber_core,
          entry_pit_depth_m: hddConfig.entry_pit_depth,
          exit_pit_depth_m: hddConfig.exit_pit_depth,
          area: hddConfig.area,
          road_name: hddConfig.road_name,
          notes: hddConfig.notes,
          color: hddColors[hddConfig.way_count] || '#ff9800',
          line_width: hddConfig.way_count + 2,
          status: 'planned',
        }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `HDD Duct saved! Length: ${lengthKm.toFixed(3)} km, ${hddConfig.way_count}-Way, ${hddConfig.fiber_core} fibers` });
        fetchDucts();
        resetDrawing();
        setShowHDDDialog(false);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save HDD duct' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving HDD duct' });
    }
  };

  const deleteDuct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this HDD duct?')) return;
    
    try {
      const res = await fetch(`/api/hdd-ducts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'HDD duct deleted' });
        fetchDucts();
        if (selectedDuct?._id === id) setSelectedDuct(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete HDD duct' });
    }
  };

  const resetDrawing = () => {
    setDrawingMode('off');
    setPathPoints([]);
    setMarkers([]);
    setTempLine(null);
    setHddConfig({
      way_count: 1,
      duct_size_mm: 40,
      duct_type: 'HDPE',
      fiber_core: 24,
      entry_pit_depth: 1.5,
      exit_pit_depth: 1.5,
      area: '',
      road_name: '',
      notes: '',
    });
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

  // Add map event handlers
  const MapEvents = () => {
    const map = useMapEvents({
      click: handleMapClick,
      dblclick: handleDoubleClick,
    });
    return null;
  };

  if (!mounted || !leafletLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-80 bg-background border-r overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2">HDD Duct Designer</h2>
          <p className="text-sm text-muted-foreground">Draw and manage HDD ducts</p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Drawing Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Drawing Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={drawingMode === 'drawing' ? 'destructive' : 'default'}
              className="w-full"
              onClick={() => {
                if (drawingMode === 'drawing') {
                  resetDrawing();
                } else {
                  setDrawingMode('drawing');
                }
              }}
            >
              {drawingMode === 'drawing' ? 'Cancel Drawing' : '✏️ Draw New Duct'}
            </Button>
            
            {drawingMode === 'drawing' && (
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                <p>💡 Instructions:</p>
                <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                  <li>Click on map to add points</li>
                  <li>Double-click to finish drawing</li>
                  <li>{pathPoints.length} points placed</li>
                  <li>Current length: {calculateLength(pathPoints as [number, number][]).toFixed(3)} km</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Ducts:</span>
              <Badge>{ducts.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Length:</span>
              <Badge variant="secondary">
                {ducts.reduce((sum, d) => sum + d.length_km, 0).toFixed(2)} km
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Fiber:</span>
              <Badge variant="outline">
                {ducts.reduce((sum, d) => sum + (d.length_km * d.fiber_core), 0).toFixed(0)} fiber-km
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Duct List */}
        {ducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Existing Ducts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {ducts.map(duct => (
                <div
                  key={duct._id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDuct?._id === duct._id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedDuct(duct)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-bold">{duct.name}</p>
                        <Badge className="bg-orange-500 text-xs">{duct.way_count}-Way</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{duct.length_km.toFixed(3)} km</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{duct.duct_size_mm}mm</Badge>
                        <Badge variant="outline" className="text-xs">{duct.duct_type}</Badge>
                        <Badge variant="secondary" className="text-xs">{duct.fiber_core} fibers</Badge>
                        <Badge className="text-xs">{duct.status}</Badge>
                      </div>
                      {duct.area && <p className="text-xs text-muted-foreground mt-1">📍 {duct.area}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => { e.stopPropagation(); deleteDuct(duct._id); }}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[23.73, 90.41]}
          zoom={13}
          className="h-full w-full"
          style={{ background: '#f0f0f0' }}
          whenReady={() => {
            // Map is ready
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          <MapEvents />
          
          {/* Render existing HDD ducts */}
          {ducts.map(duct => {
            const positions = duct.polyline;
            if (!positions || positions.length < 2) return null;
            const style = getHDDStyle(duct);
            return (
              <Polyline
                key={duct._id}
                positions={positions}
                pathOptions={{
                  color: style.color,
                  weight: style.weight,
                  opacity: style.opacity,
                  dashArray: style.dashArray,
                }}
                eventHandlers={{
                  click: () => setSelectedDuct(duct),
                }}
              />
            );
          })}
        </MapContainer>

        {/* Duct Details Panel */}
        {selectedDuct && (
          <Card className="absolute bottom-4 right-4 w-80 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Duct Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDuct(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Name:</strong> {selectedDuct.name}</p>
              <p><strong>Length:</strong> {selectedDuct.length_km.toFixed(3)} km ({Math.round(selectedDuct.length_km * 1000).toLocaleString()} m)</p>
              <p><strong>Ways:</strong> {selectedDuct.way_count}-Way</p>
              <p><strong>Duct Size:</strong> {selectedDuct.duct_size_mm}mm</p>
              <p><strong>Duct Type:</strong> {selectedDuct.duct_type}</p>
              <p><strong>Fiber Core:</strong> {selectedDuct.fiber_core} fibers</p>
              <p><strong>Entry Pit:</strong> {selectedDuct.entry_pit_depth_m}m</p>
              <p><strong>Exit Pit:</strong> {selectedDuct.exit_pit_depth_m}m</p>
              {selectedDuct.area && <p><strong>Area:</strong> {selectedDuct.area}</p>}
              {selectedDuct.road_name && <p><strong>Road:</strong> {selectedDuct.road_name}</p>}
              <p><strong>Status:</strong> <Badge>{selectedDuct.status}</Badge></p>
              {selectedDuct.notes && <p className="text-xs text-muted-foreground mt-1">{selectedDuct.notes}</p>}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Created: {new Date(selectedDuct.createdAt || '').toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* HDD Configuration Dialog */}
      <Dialog open={showHDDDialog} onOpenChange={setShowHDDDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🛠️ HDD Duct Configuration</DialogTitle>
            <DialogDescription>
              Configure the horizontal directional drilling duct parameters.
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
                    {DUCT_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}mm</SelectItem>
                    ))}
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
                    {DUCT_TYPE_OPTIONS.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fiber Core</Label>
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
                <Label>Area/Location</Label>
                <Input placeholder="e.g., Downtown" value={hddConfig.area} onChange={(e) => setHddConfig({...hddConfig, area: e.target.value})} />
              </div>
              <div>
                <Label>Road Name</Label>
                <Input placeholder="e.g., Main Street" value={hddConfig.road_name} onChange={(e) => setHddConfig({...hddConfig, road_name: e.target.value})} />
              </div>
            </div>
            
            <div>
              <Label>Notes (Optional)</Label>
              <Input placeholder="Additional notes..." value={hddConfig.notes} onChange={(e) => setHddConfig({...hddConfig, notes: e.target.value})} />
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Path Length:</span>
                <span className="font-bold">{calculateLength(pathPoints as [number, number][]).toFixed(3)} km</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total Fibers:</span>
                <span className="font-bold">{hddConfig.fiber_core} cores</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Fiber Capacity:</span>
                <span>{(calculateLength(pathPoints as [number, number][]) * hddConfig.fiber_core).toFixed(0)} fiber-km</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowHDDDialog(false);
              resetDrawing();
            }}>Cancel</Button>
            <Button onClick={saveHDDDuct}>Save HDD Duct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}