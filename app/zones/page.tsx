'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Trash2,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff
} from "lucide-react";

const ZoneMapper = dynamic(
  () => import('@/components/zone/ZoneMapper'),
  { ssr: false }
);

export default function ZonePage() {
  const [polygon, setPolygon] = useState<any[]>([]);
  const [name, setName] = useState('');

  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [hiddenZones, setHiddenZones] = useState<string[]>([]);

  // 🔄 LOAD ZONES + NODE COUNT
  const loadZones = async () => {
    const res = await fetch('/api/zones');
    const data = await res.json();

    // 🔥 attach node count
    const zonesWithCount = await Promise.all(
      data.map(async (z: any) => {
        try {
          const res = await fetch(`/api/zones/${z._id}/nodes`);
          const nodes = await res.json();

          return {
            ...z,
            nodeCount: Array.isArray(nodes) ? nodes.length : 0
          };
        } catch {
          return { ...z, nodeCount: 0 };
        }
      })
    );

    setZones(zonesWithCount);
  };

  useEffect(() => {
    loadZones();
  }, []);

  // 💾 SAVE ZONE
  const handleSave = async () => {
    if (!name || !polygon.length) {
      alert("Name + polygon required");
      return;
    }

    await fetch('/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, polygon })
    });

    setName('');
    setPolygon([]);
    loadZones();
  };

  // 🗑 DELETE
  const handleDelete = async (id: string) => {
    if (!confirm("Delete zone?")) return;

    await fetch(`/api/zones/${id}`, { method: 'DELETE' });
    loadZones();
  };

  // ✏️ RENAME
  const handleRename = async (id: string) => {
    await fetch(`/api/zones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName })
    });

    setEditingId(null);
    setEditName('');
    loadZones();
  };

  // 👁 TOGGLE VISIBILITY
  const toggleVisibility = (id: string) => {
    setHiddenZones(prev =>
      prev.includes(id)
        ? prev.filter(z => z !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen">

      {/* 🧭 SIDEBAR */}
      <div className="w-72 border-r p-3 space-y-2 overflow-y-auto text-sm">

        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Zones
        </div>

        {zones.map(z => (
          <div
            key={z._id}
            className={`flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
              selectedZone?._id === z._id ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`}
          >

            {/* 🏷 NAME */}
            <div
              className="flex-1 truncate cursor-pointer"
              onClick={() => setSelectedZone(z)}
            >
              {editingId === z._id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                />
              ) : (
                <span>
                  {z.name}
                  <span className="text-xs text-gray-400 ml-1">
                    ({z.nodeCount})
                  </span>
                </span>
              )}
            </div>

            {/* 🎯 ACTIONS */}
            <div className="flex items-center gap-1 ml-2">

              {/* 👁 TOGGLE */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleVisibility(z._id)}
              >
                {hiddenZones.includes(z._id)
                  ? <EyeOff className="w-4 h-4 text-gray-400" />
                  : <Eye className="w-4 h-4 text-green-600" />
                }
              </Button>

              {editingId === z._id ? (
                <>
                  <Button size="icon" variant="ghost"
                    onClick={() => handleRename(z._id)}>
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>

                  <Button size="icon" variant="ghost"
                    onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4 text-gray-500" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost"
                    onClick={() => {
                      setEditingId(z._id);
                      setEditName(z.name);
                    }}>
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </Button>

                  <Button size="icon" variant="ghost"
                    onClick={() => handleDelete(z._id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </>
              )}

            </div>
          </div>
        ))}

        <hr className="my-2" />

        {/* ➕ CREATE */}
        <Input
          placeholder="New zone name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
        />

        <Button onClick={handleSave} size="sm" className="w-full">
          Save Zone
        </Button>

      </div>

      {/* 🗺 MAP */}
      <div className="flex-1">
        <ZoneMapper
          onZoneCreate={setPolygon}
          zones={zones.filter(z => !hiddenZones.includes(z._id))}
          selectedZone={selectedZone}
        />
      </div>

    </div>
  );
}