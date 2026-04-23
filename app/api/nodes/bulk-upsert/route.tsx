import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import { Types } from "mongoose";

/* =========================
   📌 CONFIG
========================= */
const RADIUS = 5; // meters

/* =========================
   📏 HAVERSINE DISTANCE
========================= */
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // meters

  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   🧾 INPUT TYPE
========================= */
type NodeInput = {
  node_id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  node_category?: string;
  status?: string;
  dgm?: string;
  region?: string;
  node_code?: string;
  address?: string;
};

/* =========================
   🚀 POST BULK UPSERT
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const { data }: { data: NodeInput[] } = await req.json();

    let skipped = 0;
    let inserted = 0;
    let updated = 0;

    const operations: any[] = [];

    /* =========================
       🔥 LOAD EXISTING NODES
    ========================= */
    const existingNodes = await Node.find({}, { location: 1 });

    /* =========================
       🧠 TRACK BATCH DUPLICATES
    ========================= */
    const acceptedBatch: { lat: number; lng: number }[] = [];

    /* =========================
       🔁 PROCESS INPUT
    ========================= */
    for (const item of data) {

      if (
        !item.node_id ||
        !item.name ||
        isNaN(Number(item.latitude)) ||
        isNaN(Number(item.longitude))
      ) {
        skipped++;
        continue;
      }

      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      /* =========================
         🚫 CHECK AGAINST DB
      ========================= */
      const tooCloseDB = existingNodes.some((n: any) => {
        if (!n.location?.coordinates) return false;

        const [lng2, lat2] = n.location.coordinates;

        return getDistance(lat, lng, lat2, lng2) < RADIUS;
      });

      /* =========================
         🚫 CHECK SAME BATCH
      ========================= */
      const tooCloseBatch = acceptedBatch.some((n) => {
        return getDistance(lat, lng, n.lat, n.lng) < RADIUS;
      });

      if (tooCloseDB || tooCloseBatch) {
        skipped++;
        continue;
      }

      /* =========================
         ✅ ACCEPT NODE
      ========================= */
      acceptedBatch.push({ lat, lng });

      operations.push({
        updateOne: {
          filter: { node_id: item.node_id },
          update: {
            $set: {
              name: item.name,
              latitude: lat,
              longitude: lng,

              // 🔥 GEOJSON (IMPORTANT)
              location: {
                type: "Point",
                coordinates: [lng, lat],
              },

              node_category: item.node_category,
              status: item.status,
              dgm: item.dgm,
              region: item.region,
              node_code: item.node_code,
              address: item.address,

              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    /* =========================
       🚀 EXECUTE BULK
    ========================= */
    if (operations.length > 0) {
      const result = await Node.bulkWrite(operations, {
        ordered: false,
      });

      inserted = result.upsertedCount;
      updated = result.matchedCount - result.upsertedCount;
    }

    /* =========================
       📦 RESPONSE
    ========================= */
    return Response.json({
      inserted,
      updated,
      skipped,
      radiusApplied: `${RADIUS} meters`,
    });

  } catch (err: any) {
    console.error("❌ BULK ERROR:", err);

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}