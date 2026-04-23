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

    // 🚀 LOAD ALL DATA
    const allNodes = await Node.find({});
    const nodeMap = new Map(allNodes.map(n => [n.node_id, n]));

    const allLinks = await Link.find({});
    const linkMap = new Map(allLinks.map(l => [l.node_pair, l]));

    // 🔥 RULE TRACKING
    const odpToOcc = new Map();
    const odpToHodpCount = new Map();
    const hodpUsed = new Set();

    // 🔗 EXISTING LINKS → RULE STATE
    allLinks.forEach(l => {
      const fromNode = allNodes.find(n => n._id.toString() === l.from_node.toString());
      const toNode = allNodes.find(n => n._id.toString() === l.to_node.toString());

      if (!fromNode || !toNode) return;

      // OCC → ODP
      if (fromNode.node_category === 'OCC' && toNode.node_category === 'ODP') {
        odpToOcc.set(toNode._id.toString(), fromNode._id.toString());
      }

      // ODP → HODP
      if (fromNode.node_category === 'ODP' && toNode.node_category === 'HODP') {
        const count = odpToHodpCount.get(fromNode._id.toString()) || 0;
        odpToHodpCount.set(fromNode._id.toString(), count + 1);
        hodpUsed.add(toNode._id.toString());
      }
    });

    let bulkOps = [];

    /* =========================
       🔄 PROCESS CSV
    ========================= */
    for (let i = 1; i < rows.length; i++) {

      const values = rows[i].split(',');

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim();
      });

      try {
        const fromNode = nodeMap.get(row.from_node);
        const toNode = nodeMap.get(row.to_node);

        if (!fromNode || !toNode) {
          throw new Error('Node not found');
        }

        /* =========================
           🚫 HARD RULES
        ========================= */

        // ❌ Same category blocked
        if (fromNode.node_category === toNode.node_category) {
          throw new Error('Same category link not allowed');
        }

        // ❌ Only allow correct direction
        const validDirection =
          (fromNode.node_category === 'OCC' && toNode.node_category === 'ODP') ||
          (fromNode.node_category === 'ODP' && toNode.node_category === 'HODP');

        if (!validDirection) {
          throw new Error('Invalid direction (only OCC→ODP or ODP→HODP)');
        }

        /* =========================
           🧠 CAPACITY RULES
        ========================= */

        // OCC → ODP
        if (fromNode.node_category === 'OCC') {
          if (odpToOcc.has(toNode._id.toString())) {
            throw new Error('ODP already connected to an OCC');
          }
        }

        // ODP → HODP
        if (fromNode.node_category === 'ODP') {
          const count = odpToHodpCount.get(fromNode._id.toString()) || 0;

          if (count >= 24) {
            throw new Error('ODP reached max HODP capacity (24)');
          }

          if (hodpUsed.has(toNode._id.toString())) {
            throw new Error('HODP already connected to another ODP');
          }
        }

        /* =========================
           🔥 BUILD LINK
        ========================= */
        const result = buildLink(fromNode, toNode, row);

        if (!result.valid) {
          throw new Error(result.error);
        }

        const node_pair = result.data.node_pair;

        let status = 'ok';

        if (linkMap.has(node_pair)) {
          status = 'update';
        }

        /* =========================
           📊 PREVIEW
        ========================= */
        preview.push({
          ...row,
          fiber_type: result.data.fiber_type,
          length: result.data.length,
          status_check: status,
          error: null
        });

        /* =========================
           🔥 UPDATE RULE STATE
        ========================= */
        if (fromNode.node_category === 'OCC') {
          odpToOcc.set(toNode._id.toString(), fromNode._id.toString());
        }

        if (fromNode.node_category === 'ODP') {
          const count = odpToHodpCount.get(fromNode._id.toString()) || 0;
          odpToHodpCount.set(fromNode._id.toString(), count + 1);

          hodpUsed.add(toNode._id.toString());
        }

        /* =========================
           🚀 IMPORT
        ========================= */
        if (mode === 'import') {
          bulkOps.push({
            updateOne: {
              filter: { node_pair },
              update: result.data,
              upsert: true
            }
          });

          success++;
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

    /* =========================
       🚀 BULK WRITE
    ========================= */
    if (mode === 'import' && bulkOps.length > 0) {
      await Link.bulkWrite(bulkOps, { ordered: false });
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