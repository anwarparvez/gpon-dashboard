import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import { AnyBulkWriteOperation } from "mongoose";
import {
  getDistance,
  createLocationObject,
  getRadiusResponse,
} from "@/lib/nodeDistance.server";

const { radiusMeters: RADIUS, radiusApplied: RADIUS_APPLIED } =
  getRadiusResponse();

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

type BatchNode = {
  lat: number;
  lng: number;
  node_id?: string;
};

/* =========================
   🚀 POST BULK UPSERT
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();
    console.log("✅ DB Connected");

    const { data }: { data: NodeInput[] } = await req.json();

    if (!data || !Array.isArray(data)) {
      return Response.json(
        { error: "Invalid request: data array required" },
        { status: 400 },
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let locationSkipped = 0;

    const skippedNodes: SkipNode[] = [];
    const operations: AnyBulkWriteOperation<any>[] = [];

    /* =========================
       🔥 LOAD EXISTING NODES
    ========================= */
    const existingNodes = await Node.find(
      {},
      { location: 1, node_id: 1, latitude: 1, longitude: 1 },
    ).lean();

    // ✅ Optimized lookup
    const existingMap = new Map(existingNodes.map((n: any) => [n.node_id, n]));

    /* =========================
       🧠 TRACK BATCH DUPLICATES
    ========================= */
    const acceptedBatch: BatchNode[] = [];

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
        skippedNodes.push({
          node_id: item.node_id,
          name: item.name,
          reason: "Invalid data (missing required fields)",
        });
        continue;
      }

      const newLat = Number(item.latitude);
      const newLng = Number(item.longitude);

      const existingNode = existingMap.get(item.node_id);

      let skipReason = "";
      let skipDistance = 0;

      /* =========================
         🚫 CHECK AGAINST DB
      ========================= */
      for (const n of existingNodes) {
        if (!n.location?.coordinates) continue;

        if (existingNode && n.node_id === existingNode.node_id) continue;

        const [lng2, lat2] = n.location.coordinates;
        const dist = getDistance(newLat, newLng, lat2, lng2);

        if (dist < RADIUS) {
          skipReason = "Too close to existing node (DB)";
          skipDistance = dist;
          break;
        }
      }

      /* =========================
         🚫 CHECK BATCH
      ========================= */
      if (!skipReason) {
        for (const n of acceptedBatch) {
          if (existingNode && n.node_id === existingNode.node_id) continue;

          const dist = getDistance(newLat, newLng, n.lat, n.lng);

          if (dist < RADIUS) {
            skipReason = "Too close to another uploaded node";
            skipDistance = dist;
            break;
          }
        }
      }

      /* =========================
         ❌ SKIP
      ========================= */
      if (skipReason) {
        skipped++;
        locationSkipped++;

        skippedNodes.push({
          node_id: item.node_id,
          name: item.name,
          latitude: newLat,
          longitude: newLng,
          reason: skipReason,
          distance_m: Number(skipDistance.toFixed(2)),
        });

        continue;
      }

      /* =========================
         ✅ BUILD UPDATE
      ========================= */
      const updateData: any = {
        name: item.name,
        updatedAt: new Date(),
        latitude: newLat,
        longitude: newLng,
        location: createLocationObject(newLat, newLng),
      };

      if (item.node_category) updateData.node_category = item.node_category;
      if (item.status) updateData.status = item.status;
      if (item.dgm) updateData.dgm = item.dgm;
      if (item.region) updateData.region = item.region;
      if (item.node_code) updateData.node_code = item.node_code;
      if (item.address) updateData.address = item.address;

      acceptedBatch.push({
        lat: newLat,
        lng: newLng,
        node_id: item.node_id,
      });

      operations.push({
        updateOne: {
          filter: { node_id: item.node_id },
          update: {
            $set: updateData,
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      });
    }

    console.log("📊 Debug:", {
      totalInput: data.length,
      operations: operations.length,
      skipped,
      locationSkipped,
    });

    /* =========================
       🚀 BULK WRITE
    ========================= */
    if (operations.length > 0) {
      try {
        const result = await Node.bulkWrite(operations, { ordered: false });

        inserted = result.upsertedCount || 0;
        updated = result.modifiedCount || 0;

        console.log("🔥 Bulk Result:", {
          inserted,
          updated,
          matched: result.matchedCount,
        });
      } catch (bulkError: any) {
        console.error("Bulk write error:", bulkError);

        console.log("🔄 Falling back to individual updates...");

        for (const op of operations) {
          if ("updateOne" in op) {
            try {
              const result = await Node.updateOne(
                op.updateOne.filter,
                op.updateOne.update,
                { upsert: op.updateOne.upsert },
              );

              if (result.upsertedId) inserted++;
              else if (result.modifiedCount > 0) updated++;
            } catch (err: any) {
              console.error(
                `❌ Failed: ${op.updateOne.filter.node_id}`,
                err.message,
              );
              skipped++;
            }
          }
        }
      }
    }

    /* =========================
       📦 RESPONSE
    ========================= */
    return Response.json({
      inserted,
      updated,
      skipped,
      locationSkipped,
      totalProcessed: data.length,
      radiusApplied: RADIUS_APPLIED,
      message: `${locationSkipped} node(s) skipped due to proximity (${RADIUS}m)`,
      skipped_nodes: skippedNodes,
    });
  } catch (err: any) {
    console.error("❌ BULK ERROR:", err);

    return Response.json(
      {
        error: err.message,
        details:
          err.code === 16755
            ? "Geo index error: Invalid location data"
            : err.message,
      },
      { status: 500 },
    );
  }
}
