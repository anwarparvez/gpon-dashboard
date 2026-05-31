'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CablePathEditor({ path, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    status: path?.status || 'proposed',
    cable_type: path?.cable_type || 'underground',
    fiber_type: path?.fiber_type || 'SMF',
    fiber_core: path?.fiber_core || 24,
    color: path?.color || '#2196f3',
    notes: path?.notes || '',
  });

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/cable-paths/${path._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        alert('Cable path updated successfully');
        onSave();
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this cable path?')) {
      try {
        const res = await fetch(`/api/cable-paths/${path._id}`, { method: 'DELETE' });
        if (res.ok) {
          alert('Cable path deleted');
          onSave();
        }
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Cable Path</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>From Node</Label>
            <Input value={path?.from_node_id} disabled />
          </div>
          
          <div>
            <Label>To Node</Label>
            <Input value={path?.to_node_id} disabled />
          </div>
          
          <div>
            <Label>Length</Label>
            <Input value={`${path?.length_km?.toFixed(2)} km`} disabled />
          </div>
          
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Cable Type</Label>
            <Select value={formData.cable_type} onValueChange={(v) => setFormData({...formData, cable_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="underground">Underground</SelectItem>
                <SelectItem value="overhead">Overhead</SelectItem>
                <SelectItem value="aerial">Aerial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Fiber Type</Label>
            <Select value={formData.fiber_type} onValueChange={(v) => setFormData({...formData, fiber_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GPON">GPON</SelectItem>
                <SelectItem value="SMF">SMF</SelectItem>
                <SelectItem value="UG">UG</SelectItem>
                <SelectItem value="OH">OH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Fiber Core</Label>
            <Input 
              type="number" 
              value={formData.fiber_core} 
              onChange={(e) => setFormData({...formData, fiber_core: parseInt(e.target.value)})}
            />
          </div>
          
          <div>
            <Label>Path Color</Label>
            <Input 
              type="color" 
              value={formData.color} 
              onChange={(e) => setFormData({...formData, color: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Delete</Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}