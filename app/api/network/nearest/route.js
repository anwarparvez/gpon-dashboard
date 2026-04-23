import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";

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

export async function GET() {
  try {
    await connectDB();

    const occs = await Node.find({ node_category: "OCC" });
    const odps = await Node.find({ node_category: "ODP" });
    const hodps = await Node.find({ node_category: "HODP" });

    let csv = "occ,nearest_odp,odp_distance_km,nearest_hodp,hodp_distance_km\n";

    for (const occ of occs) {
      let nearestODP = null;
      let minODP = Infinity;

      for (const odp of odps) {
        if (!occ.latitude || !odp.latitude) continue;

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

      let nearestHODP = null;
      let minHODP = Infinity;

      if (nearestODP) {
        for (const hodp of hodps) {
          if (!hodp.latitude) continue;

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

      csv += `${occ.node_id},${nearestODP?.node_id || ""},${minODP.toFixed(3)},${nearestHODP?.node_id || ""},${minHODP.toFixed(3)}\n`;
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=nearest_nodes.csv"
      }
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}