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

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',');

    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim();
    });

    try {
      const fromNode = await Node.findOne({ node_id: row.from_node });
      const toNode = await Node.findOne({ node_id: row.to_node });

      let status = 'ok'; // ok | update | error
      let error = null;

      if (!fromNode || !toNode) {
        status = 'error';
        error = 'Node not found';
      }

      if (fromNode && toNode && fromNode._id.toString() === toNode._id.toString()) {
        status = 'error';
        error = 'Same node';
      }

      const fiber_core = Number(row.fiber_core) || 12;
      const used_core = Number(row.used_core) || 0;

      if (used_core > fiber_core) {
        status = 'error';
        error = 'Invalid core';
      }

      let node_pair = null;
      let distance = 0;
      let existing = null;

      if (fromNode && toNode) {
        const ids = [
          fromNode._id.toString(),
          toNode._id.toString()
        ].sort();

        node_pair = `${ids[0]}_${ids[1]}`;

        // 🔍 Check duplicate
        existing = await Link.findOne({ node_pair });

        if (existing && status === 'ok') {
          status = 'update';
        }

        // 🌍 Calculate distance
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

      // 👀 PREVIEW DATA
      preview.push({
        ...row,
        length: distance ? Number(distance.toFixed(3)) : 0,
        status_check: status,
        error
      });

      // 🚀 IMPORT
      if (mode === 'import' && status !== 'error') {
        await Link.findOneAndUpdate(
          { node_pair },
          {
            from_node: fromNode._id,
            to_node: toNode._id,
            node_pair,

            fiber_type: row.fiber_type || 'GPON',
            fiber_core,
            used_core,

            // 🔥 AUTO DISTANCE
            length: Number(distance.toFixed(3)),

            status: row.status || 'proposed',
            note: row.note || ''
          },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );

        success++;
      } else if (status === 'error') {
        skipped++;
      }

    } catch (err) {
      skipped++;
      errors.push(err.message);
    }
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