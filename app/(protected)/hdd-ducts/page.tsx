'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HDDDashboardReport from '@/components/HDDDashboardReport';

// Define the HDD Duct type
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

// Dynamically import the map component to avoid SSR issues
const SimpleHDDDuctMap = dynamic(() => import('@/components/SimpleHDDDuctMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export default function HDDDuctsPage() {
  const [ducts, setDucts] = useState<HDDDuct[]>([]); // ✅ Add proper type
  const [activeTab, setActiveTab] = useState('map');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDucts();
  }, []);

  const fetchDucts = async () => {
    try {
      const res = await fetch('/api/hdd-ducts');
      const data = await res.json();
      setDucts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch ducts:', error);
      setDucts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading HDD ducts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6 py-2">
          <TabsList>
            <TabsTrigger value="map">🗺️ Map View</TabsTrigger>
            <TabsTrigger value="report">📊 Report Dashboard</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="map" className="flex-1 p-0 mt-0">
          <SimpleHDDDuctMap />
        </TabsContent>
        
        <TabsContent value="report" className="flex-1 overflow-auto p-6 mt-0">
          <HDDDashboardReport 
            ducts={ducts} 
            onExport={() => {
              // Optional: additional export handling
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}