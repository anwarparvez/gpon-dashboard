import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';
import { validateLink, calculateDistanceKm } from '@/lib/gponRules';

/* =========================
   🔄 Convert to CSV
========================= */
function toCSV(rows) {
  const header = [
    'from_node',
    'from_code',
    'to_node',
    'to_code',
    'distance_km',
    'fiber_type'
  ];

  const lines = rows.map(r => [
    r.from_node,
    r.from_code,
    r.to_node,
    r.to_code,
    r.distance,
    r.fiber_type
  ].join(','));

  return [header.join(','), ...lines].join('\n');
}

/* =========================
   ✅ GET Suggestions + CSV
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download'); // ?download=1

    // 🔥 Only proposed nodes
    const nodes = await Node.find({ status: 'proposed' });

    // 🔥 Only planned links
    const links = await Link.find({ status: { $ne: 'active' } });

    // 🔗 Build connection map
    const connected = new Set();

    links.forEach(l => {
      connected.add(l.from_node.toString());
      connected.add(l.to_node.toString());
    });

    const unconnected = nodes.filter(
      n => !connected.has(n._id.toString())
    );

    let results = [];

    for (const node of unconnected) {

      // 🚫 Skip HODP already connected
      if (node.node_category === 'HODP') {
        const existing = links.filter(l =>
          l.from_node.toString() === node._id.toString() ||
          l.to_node.toString() === node._id.toString()
        );

        if (existing.length >= 1) continue;
      }

      let best = null;
      let bestDist = Infinity;

      for (const candidate of nodes) {

        if (node._id.toString() === candidate._id.toString()) continue;

        // 🔥 GPON validation
        const validation = validateLink(node, candidate);
        if (!validation.valid) continue;

        const dist = calculateDistanceKm(
          node.latitude,
          node.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (!dist) continue;

        if (dist < bestDist) {
          bestDist = dist;

          best = {
            from_node: node.node_id,
            from_code: node.node_code || '',
            to_node: candidate.node_id,
            to_code: candidate.node_code || '',
            distance: Number(dist.toFixed(3)),
            fiber_type: validation.fiber_type
          };
        }
      }

      if (best) {
        results.push(best);
      }
    }

    /* =========================
       📥 CSV DOWNLOAD
    ========================= */
    if (download === '1') {
      const csv = toCSV(results);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=network_suggestions.csv'
        }
      });
    }

    /* =========================
       📦 JSON RESPONSE
    ========================= */
    return Response.json({
      total_unconnected: unconnected.length,
      suggestions: results
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 500 });
  }
}