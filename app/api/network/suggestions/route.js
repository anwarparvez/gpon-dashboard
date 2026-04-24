import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';

/* =========================
   🌍 Distance (KM)
========================= */
function distanceKm(lat1, lon1, lat2, lon2) {
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

/* =========================
   🔄 CSV FORMAT
========================= */
function toCSV(rows) {
  const header = [
    "from_node",
    "to_node",
    "fiber_type",
    "fiber_core",
    "used_core",
    "length",
    "status",
    "note"
  ];

  const lines = rows.map(r => [
    r.from_node,
    r.to_node,
    r.fiber_type || "",
    r.fiber_core ?? "",
    r.used_core ?? 0,
    r.length ?? 0,
    r.status || "planned",
    `"${(r.note || "").replace(/"/g, '""')}"`
  ].join(","));

  return [header.join(","), ...lines].join("\n");
}

/* =========================
   ✅ GET
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download");

    // 🎯 Load nodes
    const odps = await Node.find({ node_category: 'ODP' });
    const occs = await Node.find({ node_category: 'OCC' });
    const hodps = await Node.find({ node_category: 'HODP' });

    const links = await Link.find({});

    /* =========================
       🔍 Detect connections
    ========================= */
    const odpConnected = new Set();
    const hodpConnected = new Set();

    links.forEach(l => {
      const from = l.from_node.toString();
      const to = l.to_node.toString();

      // OCC <-> ODP
      if (odps.find(n => n._id.toString() === to) &&
          occs.find(n => n._id.toString() === from)) {
        odpConnected.add(to);
      }

      if (odps.find(n => n._id.toString() === from) &&
          occs.find(n => n._id.toString() === to)) {
        odpConnected.add(from);
      }

      // ODP <-> HODP
      if (hodps.find(n => n._id.toString() === to) &&
          odps.find(n => n._id.toString() === from)) {
        hodpConnected.add(to);
      }

      if (hodps.find(n => n._id.toString() === from) &&
          odps.find(n => n._id.toString() === to)) {
        hodpConnected.add(from);
      }
    });

    /* =========================
       ❌ Unconnected Nodes
    ========================= */
    const unconnectedODP = odps.filter(
      o => !odpConnected.has(o._id.toString())
    );

    const unconnectedHODP = hodps.filter(
      h => !hodpConnected.has(h._id.toString())
    );

    const suggestions = [];

    /* =========================
       🧠 ODP → OCC (Feeder)
    ========================= */
    for (const odp of unconnectedODP) {

      let nearest = null;
      let minDist = Infinity;

      for (const occ of occs) {
        if (!odp.latitude || !occ.latitude) continue;

        const dist = distanceKm(
          odp.latitude,
          odp.longitude,
          occ.latitude,
          occ.longitude
        );

        if (dist < minDist) {
          minDist = dist;
          nearest = occ;
        }
      }

      if (nearest) {
        suggestions.push({
          from_node: nearest.node_id,
          to_node: odp.node_id,
          fiber_type: "feeder",
          fiber_core: 48,
          used_core: 0,
          length: Number(minDist.toFixed(3)),
          status: "planned",
          note: "Auto: Connect ODP to nearest OCC"
        });
      }
    }

    /* =========================
       🧠 HODP → ODP (Distribution)
    ========================= */
    for (const hodp of unconnectedHODP) {

      let nearest = null;
      let minDist = Infinity;

      for (const odp of odps) {
        if (!hodp.latitude || !odp.latitude) continue;

        const dist = distanceKm(
          hodp.latitude,
          hodp.longitude,
          odp.latitude,
          odp.longitude
        );

        if (dist < minDist) {
          minDist = dist;
          nearest = odp;
        }
      }

      if (nearest) {
        suggestions.push({
          from_node: nearest.node_id,
          to_node: hodp.node_id,
          fiber_type: "distribution",
          fiber_core: 24,
          used_core: 0,
          length: Number(minDist.toFixed(3)),
          status: "planned",
          note: "Auto: Connect HODP to nearest ODP"
        });
      }
    }

    /* =========================
       📥 CSV DOWNLOAD
    ========================= */
    if (download === "1") {
      const csv = toCSV(suggestions);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=suggested_links.csv"
        }
      });
    }

    /* =========================
       📦 JSON
    ========================= */
    return Response.json({
      feeder_links: unconnectedODP.length,
      distribution_links: unconnectedHODP.length,
      total: suggestions.length,
      data: suggestions
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}