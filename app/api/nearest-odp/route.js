import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

// 🌍 Haversine (KM)
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
  try {
    await connectDB();

    const body = await req.json();
    const nodeIds = body.node_ids;

    if (!Array.isArray(nodeIds)) {
      return Response.json({ error: "node_ids must be array" }, { status: 400 });
    }

    // 🎯 OCC nodes (input)
    const occs = await Node.find({
      node_id: { $in: nodeIds },
      node_category: 'OCC'
    });

    // 🔍 Reference nodes
    const odps = await Node.find({ node_category: 'ODP' });
    const hodps = await Node.find({ node_category: 'HODP' });

    let csv = "occ,nearest_odp,odp_distance_km,nearest_hodp,hodp_distance_km\n";

    for (const occ of occs) {
      let nearestODP = null;
      let minODP = Infinity;

      // 🔎 OCC → ODP
      for (const odp of odps) {
        if (
          occ.latitude == null || occ.longitude == null ||
          odp.latitude == null || odp.longitude == null
        ) continue;

        const dist = distanceKm(
          occ.latitude,
          occ.longitude,
          odp.latitude,
          odp.longitude
        );

        if (dist < minODP) {
          minODP = dist;
          nearestODP = odp;
        }
      }

      // 🔎 ODP → HODP
      let nearestHODP = null;
      let minHODP = Infinity;

      if (nearestODP) {
        for (const hodp of hodps) {
          if (
            nearestODP.latitude == null || nearestODP.longitude == null ||
            hodp.latitude == null || hodp.longitude == null
          ) continue;

          const dist = distanceKm(
            nearestODP.latitude,
            nearestODP.longitude,
            hodp.latitude,
            hodp.longitude
          );

          if (dist < minHODP) {
            minHODP = dist;
            nearestHODP = hodp;
          }
        }
      }

      const row = {
        occ: occ.node_id,
        nearest_odp: nearestODP?.node_id || '',
        odp_distance_km: minODP === Infinity ? '' : Number(minODP.toFixed(3)),
        nearest_hodp: nearestHODP?.node_id || '',
        hodp_distance_km: minHODP === Infinity ? '' : Number(minHODP.toFixed(3))
      };

      const line = `${row.occ},${row.nearest_odp},${row.odp_distance_km},${row.nearest_hodp},${row.hodp_distance_km}`;

      console.log(line);
      csv += line + "\n";
    }

    // 📥 CSV Download
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=occ_odp_hodp_mapping.csv"
      }
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}