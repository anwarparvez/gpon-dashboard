'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MigratePage() {
  const [progress, setProgress] = useState<any>(null);

  const startMigration = async () => {
    await fetch('/api/migrate/nodes/bulk', {
      method: 'POST'
    });
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/migrate/nodes/progress');
        if (!res.ok) return;

        const data = await res.json();
        setProgress(data);
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const percent = progress?.total
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-4">

      <h1 className="text-xl font-bold">
        ⚡ Bulk Node Migration
      </h1>

      <Button onClick={startMigration}>
        Start Bulk Migration
      </Button>

      {progress && (
        <div className="space-y-2">

          <div>Status: {progress.running ? 'Running' : 'Done'}</div>
          <div>Total: {progress.total}</div>
          <div>Processed: {progress.processed}</div>
          <div>Updated: {progress.updated}</div>

          <div className="w-full bg-gray-200 h-4 rounded">
            <div
              className="bg-green-600 h-4 rounded"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div>{percent}%</div>
        </div>
      )}

    </div>
  );
}