'use client';

import { useEffect, useState } from 'react';
import HDDDashboardReport from '@/components/HDDDashboardReport';

export default function HDDDuctsPage() {
  const [ducts, setDucts] = useState([]);
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HDDDashboardReport 
        ducts={ducts} 
        onExport={() => {
          // Optional: additional export handling
        }}
      />
    </div>
  );
}