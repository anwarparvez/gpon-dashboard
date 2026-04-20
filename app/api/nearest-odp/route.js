import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

// 🌍 Haversine
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

export async function POST(req) {
  console.log("📥 Request received");

  try {
    await connectDB();

    const body = await req.json();
    const nodeIds = body.node_ids;

    if (!Array.isArray(nodeIds)) {
      return Response.json({ error: "node_ids must be array" }, { status: 400 });
    }

    const nodes = await Node.find({
      node_id: { $in: nodeIds }
    });

    const odps = await Node.find({
      node_category: 'ODP'
    });

    let results = [];

    // 🧾 CSV Header
    let csv = "node,nearest_odp,distance_km\n";

    for (const node of nodes) {
      let nearest = null;
      let minDist = Infinity;

      for (const odp of odps) {
        if (
          node.latitude == null || node.longitude == null ||
          odp.latitude == null || odp.longitude == null
        ) continue;

        const dist = distanceKm(
          node.latitude,
          node.longitude,
          odp.latitude,
          odp.longitude
        );

        if (dist < minDist) {
          minDist = dist;
          nearest = odp;
        }
      }

      const result = {
        node: node.node_id,
        nearest_odp: nearest?.node_id || '',
        distance_km: minDist === Infinity ? '' : Number(minDist.toFixed(3))
      };

      // 🔥 CSV LINE
      const line = `${result.node},${result.nearest_odp},${result.distance_km}`;

      console.log(line); // 👉 CSV LOG

      csv += line + "\n";
      results.push(result);
    }

    console.log("✅ CSV Output:\n" + csv);

    // 👉 Return CSV (downloadable)
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=nearest_odp.csv"
      }
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}