import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';

export async function POST(req) {
  await connectDB();

  const formData = await req.formData();
  const file = formData.get('file');
  const mode = formData.get('mode'); // preview or import

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

      let status = 'ok';
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

      preview.push({
        ...row,
        status_check: status,
        error
      });

      // 👉 Only insert if mode = import AND valid
      if (mode === 'import' && status === 'ok') {
        const ids = [
          fromNode._id.toString(),
          toNode._id.toString()
        ].sort();

        const node_pair = `${ids[0]}_${ids[1]}`;

        await Link.findOneAndUpdate(
          { node_pair },
          {
            from_node: ids[0],
            to_node: ids[1],
            fiber_type: row.fiber_type || 'GPON',
            fiber_core,
            used_core,
            length: Number(row.length) || 0,
            status: row.status || 'planned',
            note: row.note || ''
          },
          { upsert: true }
        );

        success++;
      } else if (status !== 'ok') {
        skipped++;
      }

    } catch (err) {
      errors.push(err.message);
    }
  }

  return Response.json({
    preview,
    summary: {
      total: preview.length,
      valid: preview.filter(p => p.status_check === 'ok').length,
      invalid: preview.filter(p => p.status_check !== 'ok').length,
      inserted: success
    }
  });
}