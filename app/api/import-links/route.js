import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';
import { buildLink } from '@/lib/gponRules';

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get('file');
    const mode = formData.get('mode'); // preview | import

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();

    const rows = text
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      return Response.json({ error: 'Invalid CSV format' }, { status: 400 });
    }

    const headers = rows[0].split(',').map(h => h.trim());

    let preview = [];
    let success = 0;
    let skipped = 0;

    // 🚀 LOAD DATA ONCE (FAST)
    const allNodes = await Node.find({});
    const nodeMap = new Map(allNodes.map(n => [n.node_id, n]));

    const allLinks = await Link.find({});
    const linkMap = new Map(allLinks.map(l => [l.node_pair, l]));

    let bulkOps = [];

    // 🔄 LOOP ROWS
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',');

      // ✅ FIXED (removed TS syntax)
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim();
      });

      try {
        const fromNode = nodeMap.get(row.from_node);
        const toNode = nodeMap.get(row.to_node);

        // 🔥 CENTRAL ENGINE
        const result = buildLink(fromNode, toNode, row);

        let status = 'ok';
        let error = null;

        if (!result.valid) {
          status = 'error';
          error = result.error;
        }

        const node_pair = result.valid ? result.data.node_pair : null;

        // 🔄 detect update
        if (result.valid && linkMap.has(node_pair)) {
          status = 'update';
        }

        // 👀 PREVIEW
        preview.push({
          ...row,
          fiber_type: result.valid ? result.data.fiber_type : null,
          length: result.valid ? result.data.length : 0,
          status_check: status,
          error
        });

        // 🚀 IMPORT
        if (mode === 'import' && result.valid) {
          bulkOps.push({
            updateOne: {
              filter: { node_pair },
              update: result.data,
              upsert: true
            }
          });

          success++;
        } else if (!result.valid) {
          skipped++;
        }

      } catch (err) {
        skipped++;

        preview.push({
          ...row,
          status_check: 'error',
          error: err?.message || 'Unknown error'
        });
      }
    }

    // 🚀 BULK EXECUTE
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

  } catch (error) {
    return Response.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}