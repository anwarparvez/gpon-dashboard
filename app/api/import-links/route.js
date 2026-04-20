import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';

// 🌍 Haversine Distance (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req) {
  await connectDB();

  const formData = await req.formData();
  const file = formData.get('file');
  const mode = formData.get('mode'); // preview | import

  const text = await file.text();

  const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
  const headers = rows[0].split(',');

  let preview = [];
  let success = 0;
  let skipped = 0;
  let errors = [];

  // 🚀 LOAD EVERYTHING ONCE
  const allNodes = await Node.find({});
  const nodeMap = new Map(allNodes.map(n => [n.node_id, n]));

  const allLinks = await Link.find({});
  const linkMap = new Map(allLinks.map(l => [l.node_pair, l]));

  let bulkOps = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',');

    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim();
    });

    try {
      let status = 'ok';
      let error = null;

      const fromNode = nodeMap.get(row.from_node);
      const toNode = nodeMap.get(row.to_node);

      // ❌ Node validation
      if (!fromNode || !toNode) {
        status = 'error';
        error = 'Node not found';
      }

      // ❌ Same node
      if (fromNode && toNode &&
        fromNode._id.toString() === toNode._id.toString()) {
        status = 'error';
        error = 'Same node';
      }

      // 🔢 Core validation
      const fiber_core = Number(row.fiber_core) || 12;
      const used_core = Number(row.used_core) || 0;

      if (used_core > fiber_core) {
        status = 'error';
        error = 'Invalid core';
      }

      let node_pair = null;
      let distance = 0;

      if (fromNode && toNode) {
        const ids = [
          fromNode._id.toString(),
          toNode._id.toString()
        ].sort();

        node_pair = `${ids[0]}_${ids[1]}`;

        // 🔍 Duplicate check (IN MEMORY ⚡)
        if (linkMap.has(node_pair) && status === 'ok') {
          status = 'update';
        }

        // 🌍 Distance
        if (
          fromNode.latitude != null &&
          fromNode.longitude != null &&
          toNode.latitude != null &&
          toNode.longitude != null
        ) {
          distance = calculateDistance(
            fromNode.latitude,
            fromNode.longitude,
            toNode.latitude,
            toNode.longitude
          );
        }
      }

      // 👀 Preview
      preview.push({
        ...row,
        length: Number(distance.toFixed(3)),
        status_check: status,
        error
      });

      // 🚀 IMPORT (BULK)
      if (mode === 'import' && status !== 'error') {
        bulkOps.push({
          updateOne: {
            filter: { node_pair },
            update: {
              from_node: fromNode._id,
              to_node: toNode._id,
              node_pair,

              fiber_type: row.fiber_type || 'GPON',
              fiber_core,
              used_core,
              length: Number(distance.toFixed(3)),

              status: row.status || 'proposed',
              note: row.note || ''
            },
            upsert: true
          }
        });

        success++;
      } else if (status === 'error') {
        skipped++;
      }

    } catch (err) {
      skipped++;
      errors.push(err.message);
    }
  }

  // 🚀 EXECUTE BULK ONCE (VERY FAST)
  if (mode === 'import' && bulkOps.length > 0) {
    await Link.bulkWrite(bulkOps);
  }

  return Response.json({
    preview,
    summary: {
      total: preview.length,
      new: preview.filter(p => p.status_check === 'ok').length,
      updates: preview.filter(p => p.status_check === 'update').length,
      invalid: preview.filter(p => p.status_check === 'error').length,
      inserted: success
    }
  });
}