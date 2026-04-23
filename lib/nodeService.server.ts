// lib/nodeService.server.ts

import Node from '@/models/Node';
import Counter from '@/models/Counter';

/* ================================
   🔢 SEQUENCE GENERATOR
================================ */
export async function getNextSequences(category: string, count: number) {
  const counter = await Counter.findOneAndUpdate(
    { category },
    { $inc: { seq: count } },
    { returnDocument: 'after', upsert: true }
  );

  const start = counter.seq - count + 1;

  return Array.from({ length: count }, (_, i) => start + i);
}

/* ================================
   📍 DUPLICATE CHECK (BATCH)
================================ */
export async function getDuplicateCoords(items: any[]) {
  const coords = items.map(i => ({
    latitude: Number(i.latitude),
    longitude: Number(i.longitude)
  }));

  const existing = await Node.find({ $or: coords })
    .select('latitude longitude');

  return new Set(
    existing.map(e => `${e.latitude}_${e.longitude}`)
  );
}

/* ================================
   🧼 NORMALIZE INPUT
================================ */
export function normalizeNode(item: any) {
  return {
    name: item.name?.trim(),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    node_category: item.node_category || 'HODP',
    status: item.status || 'proposed',
    dgm: item.dgm || '',
    region: item.region || '',
    node_code: item.node_code || '',
    address: item.address || ''
  };
}