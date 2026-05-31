'use client';

import { useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SimpleHDDDuctDrawerProps {
  mode: 'off' | 'drawing';
  onDuctCreated: (duct: any) => void;
  onCancel: () => void;
}

export default function SimpleHDDDuctDrawer({ mode, onDuctCreated, onCancel }: SimpleHDDDuctDrawerProps) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [tempLine, setTempLine] = useState<L.Polyline | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [ductName, setDuctName] = useState('');
  const [ductType, setDuctType] = useState('HDPE');
  const [wayCount, setWayCount] = useState(1);

  const map = useMapEvents({
    click(e) {
      if (mode !== 'drawing') return;
      
      const { lat, lng } = e.latlng;
      const newPoint: [number, number] = [lat, lng];
      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      
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
      }).addTo(map);
      
      setTempLine(newTempLine);
    },
    
    dblclick() {
      if (mode !== 'drawing' || points.length < 2) return;
      
      // Clean up temp line and markers
      if (tempLine) map.removeLayer(tempLine);
      markers.forEach(marker => map.removeLayer(marker));
      
      setShowDialog(true);
    },
  });

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

  const handleSave = async () => {
    const lengthKm = calculateLength(points);
    const path_points = points.map(p => [p[1], p[0]]); // Convert to [lng, lat]
    
    onDuctCreated({
      name: ductName || `HDD-${Date.now()}`,
      path_points: path_points,
      polyline: points,
      length_km: lengthKm,
      duct_type: ductType,
      way_count: wayCount,
      status: 'planned',
    });
    
    setShowDialog(false);
    setPoints([]);
    setMarkers([]);
    setTempLine(null);
    setDuctName('');
    onCancel();
  };

  const handleCancel = () => {
    if (tempLine) map.removeLayer(tempLine);
    markers.forEach(marker => map.removeLayer(marker));
    setPoints([]);
    setMarkers([]);
    setTempLine(null);
    onCancel();
  };

  const totalLength = calculateLength(points);

  return (
    <>
      {(mode === 'drawing' && points.length > 0) && (
        <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] w-80 shadow-lg">
          <CardContent className="p-3">
            <div className="text-center text-sm">
              <p>📏 Current Length: <strong>{totalLength.toFixed(3)} km</strong></p>
              <p className="text-xs text-muted-foreground">📍 {points.length} points placed</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setShowDialog(true)} disabled={points.length < 2}>
                  Continue →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save HDD Duct</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Duct Name</Label>
              <Input 
                placeholder={`HDD-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`}
                value={ductName}
                onChange={(e) => setDuctName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duct Type</Label>
                <Select value={ductType} onValueChange={setDuctType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HDPE">HDPE</SelectItem>
                    <SelectItem value="PVC">PVC</SelectItem>
                    <SelectItem value="Steel">Steel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ways</Label>
                <Select value={wayCount.toString()} onValueChange={(v) => setWayCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-Way</SelectItem>
                    <SelectItem value="2">2-Way</SelectItem>
                    <SelectItem value="3">3-Way</SelectItem>
                    <SelectItem value="4">4-Way</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Length:</span>
                <span className="font-bold">{totalLength.toFixed(3)} km</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Points:</span>
                <span>{points.length}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Duct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}