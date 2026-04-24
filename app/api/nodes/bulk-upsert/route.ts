import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import { AnyBulkWriteOperation } from "mongodb";

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
  lng2: number,
): number {
  const R = 6371000;

  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   🧾 TYPES
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

type SkipNode = {
  node_id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  reason: string;
  distance_m?: number;
};

type ExistingNode = {
  location?: {
    coordinates: [number, number];
  };
};

type BatchNode = {
  lat: number;
  lng: number;
};

/* =========================
   🚀 POST BULK UPSERT
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();
    console.log("✅ DB Connected");

    const { data }: { data: NodeInput[] } = await req.json();

    let skipped = 0;
    let inserted = 0;
    let updated = 0;

    const skippedNodes: SkipNode[] = [];
    const operations: AnyBulkWriteOperation<any>[] = [];

    /* =========================
       🔥 LOAD EXISTING NODES
    ========================= */
    const existingNodes: ExistingNode[] = await Node.find(
      {},
      { location: 1 },
    ).lean();

    /* =========================
       🧠 TRACK BATCH DUPLICATES
    ========================= */
    const acceptedBatch: BatchNode[] = [];

    /* =========================
       🔁 PROCESS INPUT
    ========================= */
    for (const item of data) {
      const lat = parseFloat(String(item.latitude));
      const lng = parseFloat(String(item.longitude));

      /* =========================
         ❌ INVALID DATA
      ========================= */
      if (!item.node_id || !item.name || isNaN(lat) || isNaN(lng)) {
        skipped++;

        skippedNodes.push({
          node_id: item.node_id,
          name: item.name,
          reason: "Invalid data",
        });

        continue;
      }

      let skipReason = "";
      let skipDistance = 0;

      /* =========================
         🚫 CHECK AGAINST DB
      ========================= */
      for (const n of existingNodes) {
        if (!n.location?.coordinates) continue;

        const [lng2, lat2] = n.location.coordinates;

        const dist = getDistance(lat, lng, lat2, lng2);

        if (dist < RADIUS) {
          skipReason = "Too close to existing node (DB)";
          skipDistance = dist;
          break;
        }
      }

      /* =========================
         🚫 CHECK SAME BATCH
      ========================= */
      if (!skipReason) {
        for (const n of acceptedBatch) {
          const dist = getDistance(lat, lng, n.lat, n.lng);

          if (dist < RADIUS) {
            skipReason = "Too close to another uploaded node";
            skipDistance = dist;
            break;
          }
        }
      }

      /* =========================
         ❌ SKIP NODE
      ========================= */
      if (skipReason) {
        skipped++;

        skippedNodes.push({
          node_id: item.node_id,
          name: item.name,
          latitude: lat,
          longitude: lng,
          reason: skipReason,
          distance_m: Number(skipDistance.toFixed(2)),
        });

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
              node_id: item.node_id,
              name: item.name,
              latitude: lat,
              longitude: lng,
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

    console.log("📊 Debug:", {
      totalInput: data.length,
      operations: operations.length,
      skipped,
    });

    /* =========================
       🚀 EXECUTE BULK
    ========================= */
    if (operations.length > 0) {
      const result = await Node.bulkWrite(
        operations as AnyBulkWriteOperation<any>[],
        { ordered: false },
      );

      console.log("🔥 Bulk Result:", result);

      inserted = result.upsertedCount ?? 0;
      updated = result.modifiedCount ?? 0;
    }

    /* =========================
       📦 RESPONSE
    ========================= */
    return Response.json({
      inserted,
      updated,
      skipped,
      radiusApplied: `${RADIUS} meters`,
      skipped_nodes: skippedNodes,
    });
  } catch (err: unknown) {
    console.error("❌ BULK ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
}
