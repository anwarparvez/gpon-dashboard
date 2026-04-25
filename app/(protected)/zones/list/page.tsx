'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";

type ZoneType = {
  _id: string;
  name: string;
};

type NodeType = {
  _id: string;
  node_id: string;
  node_category: string;
};

export default function ZoneListPage() {
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [selected, setSelected] = useState<ZoneType | null>(null);

  useEffect(() => {
    fetch('/api/zones')
      .then(r => r.json())
      .then(setZones);
  }, []);

  const loadNodes = async (zone: ZoneType) => {
    setSelected(zone);

    try {
      const res = await fetch(`/api/zones/${zone._id}/nodes`);

      if (!res.ok) {
        setNodes([]);
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setNodes([]);
        return;
      }

      setNodes(data);

    } catch {
      setNodes([]);
    }
  };

  // 📊 Stats
  const stats = {
    OLT: 0,
    OCC: 0,
    ODP: 0,
    HODP: 0,
    'Branch Point': 0
  };

  nodes.forEach((n) => {
    if (stats[n.node_category as keyof typeof stats] !== undefined) {
      stats[n.node_category as keyof typeof stats]++;
    }
  });

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">📋 Zones</h1>

      {/* 🔹 Zone Buttons */}
      <div className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <Button
            key={z._id}
            size="sm"
            onClick={() => loadNodes(z)}
            variant={selected?._id === z._id ? "default" : "outline"}
          >
            {z.name}
          </Button>
        ))}
      </div>

      {/* 🔹 Summary */}
      {selected && (
        <div className="grid md:grid-cols-2 gap-4">

          {/* 📊 SUMMARY TABLE */}
          <Card>
            <CardHeader>
              <CardTitle>
                📊 {selected.name} Summary
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {Object.entries(stats).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {value}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {nodes.length}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 📋 NODE LIST */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Nodes</CardTitle>
            </CardHeader>

            <CardContent className="max-h-[400px] overflow-auto space-y-2">

              {nodes.map((n) => (
                <div
                  key={n._id}
                  className="flex justify-between p-2 border rounded text-sm"
                >
                  <span>{n.node_id}</span>

                  <span className="text-muted-foreground">
                    {n.node_category}
                  </span>
                </div>
              ))}

              {nodes.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No nodes found
                </div>
              )}

            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}