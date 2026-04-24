import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

/* =========================
   🌍 Distance (KM)
========================= */
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
   🧾 TYPES
========================= */
type NodeDoc = {
  _id: unknown;
  node_id: string;
  name?: string;
  latitude?: number;
  longitude?: number;
};

/* =========================
   🔄 CSV FORMAT
========================= */
function toCSV(rows: {
  hodp_id: string;
  hodp_name: string;
  latitude?: number;
  longitude?: number;
  nearest_odp: string;
  distance_km: number | string;
}[]): string {

  const header = [
    "hodp_id",
    "hodp_name",
    "latitude",
    "longitude",
    "nearest_odp",
    "distance_km"
  ];

  const lines = rows.map(r => [
    r.hodp_id,
    `"${(r.hodp_name || "").replace(/"/g, '""')}"`,
    r.latitude ?? "",
    r.longitude ?? "",
    r.nearest_odp ?? "",
    r.distance_km ?? ""
  ].join(","));

  return [header.join(","), ...lines].join("\n");
}

/* =========================
   ✅ GET
========================= */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download");

    // 🎯 Load nodes
    const hodps: NodeDoc[] = await Node.find({ node_category: 'HODP' }).lean();
    const odps: NodeDoc[] = await Node.find({ node_category: 'ODP' }).lean();

    /* =========================
       ❌ Unconnected HODP
       (Simplified: assume all)
    ========================= */
    const unconnectedHODP = hodps;

    /* =========================
       📍 Nearest ODP
    ========================= */
    const result = unconnectedHODP.map((hodp) => {

      let nearest: NodeDoc | null = null;
      let minDist = Infinity;

      for (const odp of odps) {

        if (
          hodp.latitude == null ||
          hodp.longitude == null ||
          odp.latitude == null ||
          odp.longitude == null
        ) continue;

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

      return {
        hodp_id: hodp.node_id,
        hodp_name: hodp.name || "",
        latitude: hodp.latitude,
        longitude: hodp.longitude,
        nearest_odp: nearest?.node_id || "",
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
          "Content-Disposition": "attachment; filename=unconnected_hodp_nearest_odp.csv"
        }
      });
    }

    /* =========================
       📦 JSON
    ========================= */
    return Response.json({
      total_hodp: hodps.length,
      unconnected_hodp: result.length,
      data: result
    });

  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500 }
    );
  }
}