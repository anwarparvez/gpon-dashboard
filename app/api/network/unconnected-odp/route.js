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
    "odp_id",
    "odp_name",
    "latitude",
    "longitude",
    "nearest_occ",
    "distance_km"
  ];

  const lines = rows.map(r => [
    r.odp_id,
    `"${(r.odp_name || "").replace(/"/g, '""')}"`,
    r.latitude ?? "",
    r.longitude ?? "",
    r.nearest_occ ?? "",
    r.distance_km ?? ""
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

    // 🎯 Get nodes
    const odps = await Node.find({ node_category: 'ODP' });
    const occs = await Node.find({ node_category: 'OCC' });

    // 🔗 Links
    const links = await Link.find({});

    /* =========================
       🔍 Find connected ODP
    ========================= */
    const odpConnected = new Set();

    links.forEach(l => {
      const from = l.from_node.toString();
      const to = l.to_node.toString();

      const fromNode = odps.find(n => n._id.toString() === from);
      const toNode = odps.find(n => n._id.toString() === to);

      // OCC → ODP
      if (toNode) {
        const occ = occs.find(o => o._id.toString() === from);
        if (occ) odpConnected.add(to);
      }

      // Reverse
      if (fromNode) {
        const occ = occs.find(o => o._id.toString() === to);
        if (occ) odpConnected.add(from);
      }
    });

    /* =========================
       ❌ Unconnected ODP
    ========================= */
    const unconnectedODP = odps.filter(
      o => !odpConnected.has(o._id.toString())
    );

    /* =========================
       🔍 Nearest OCC
    ========================= */
    const result = unconnectedODP.map(odp => {

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

      return {
        odp_id: odp.node_id,
        odp_name: odp.name,
        latitude: odp.latitude,
        longitude: odp.longitude,
        nearest_occ: nearest?.node_id || "",
        distance_km:
          minDist === Infinity ? "" : Number(minDist.toFixed(3))
      };
    });

    /* =========================
       📥 CSV DOWNLOAD
    ========================= */
    if (download === "1") {
      const csv = toCSV(result);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=unconnected_odp.csv"
        }
      });
    }

    /* =========================
       📦 JSON
    ========================= */
    return Response.json({
      total_odp: odps.length,
      unconnected_odp: result.length,
      data: result
    });

  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}