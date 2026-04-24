import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import { getShortCategoryName, getNextSequences, normalizeNode } from "@/lib/nodeService.server";
import {
  getDistance,
  isTooClose,
  createLocationObject,
  preserveExistingLocation,
  buildBaseUpdateData,
  sanitizeUpdateData,
  getRadiusResponse
} from "@/lib/nodeDistance.server";

const RADIUS = getRadiusResponse().radiusMeters;

/* ================================
   ✅ GET: Fetch all nodes
================================ */
export async function GET() {
  try {
    await connectDB();
    const nodes = await Node.find().sort({ createdAt: -1 });
    return Response.json(nodes);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================================
   ✅ POST: Insert / Bulk
================================ */
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    /* ============================
       🚀 BULK INSERT
    ============================ */
    if (body.bulk) {
      const validItems = body.data
        .map(normalizeNode)
        .filter(
          (i: any) => i.name && !isNaN(i.latitude) && !isNaN(i.longitude)
        );

      // Load existing nodes
      const existingNodes = await Node.find({}, { location: 1, _id: 1 });
      const acceptedBatch: { lat: number; lng: number }[] = [];
      const filtered: any[] = [];
      const skippedNodes: any[] = []; // Track skipped nodes with reasons

      for (const item of validItems) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);

        const tooCloseDB = isTooClose(lat, lng, existingNodes, undefined, RADIUS);
        
        if (tooCloseDB) {
          // Find the actual distance for reporting
          let distance = 0;
          for (const n of existingNodes) {
            if (n.location?.coordinates) {
              const [lng2, lat2] = n.location.coordinates;
              const dist = getDistance(lat, lng, lat2, lng2);
              if (dist < RADIUS) {
                distance = dist;
                break;
              }
            }
          }
          skippedNodes.push({
            node_id: item.node_id,
            name: item.name,
            latitude: lat,
            longitude: lng,
            reason: "Too close to existing node (DB)",
            distance_m: Number(distance.toFixed(2)),
          });
          continue;
        }

        // Check against same batch
        let batchTooClose = false;
        let batchDistance = 0;
        for (const b of acceptedBatch) {
          const dist = getDistance(lat, lng, b.lat, b.lng);
          if (dist < RADIUS) {
            batchTooClose = true;
            batchDistance = dist;
            break;
          }
        }

        if (batchTooClose) {
          skippedNodes.push({
            node_id: item.node_id,
            name: item.name,
            latitude: lat,
            longitude: lng,
            reason: "Too close to another uploaded node",
            distance_m: Number(batchDistance.toFixed(2)),
          });
          continue;
        }

        acceptedBatch.push({ lat, lng });
        filtered.push(item);
      }

      // Group by category
      const grouped: Record<string, any[]> = {};
      filtered.forEach((i: any) => {
        if (!grouped[i.node_category]) grouped[i.node_category] = [];
        grouped[i.node_category].push(i);
      });

      const finalInsert: any[] = [];

      for (const category in grouped) {
        const items = grouped[category];
        const seqs = await getNextSequences(category, items.length);

        items.forEach((item: any, idx: number) => {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);

          finalInsert.push({
            ...item,
            latitude: lat,
            longitude: lng,
            location: createLocationObject(lat, lng),
            node_id: `${getShortCategoryName(category)}-${String(seqs[idx]).padStart(5, "0")}`,
          });
        });
      }

      const result = await Node.insertMany(finalInsert);

      return Response.json({
        inserted: result.length,
        skipped: skippedNodes.length,
        radiusApplied: `${RADIUS}m`,
        skipped_nodes: skippedNodes, // Include detailed skip information
      });
    }

    /* ============================
       ➕ SINGLE INSERT
    ============================ */
    const nodeData = normalizeNode(body);
    if (!nodeData.name || isNaN(nodeData.latitude) || isNaN(nodeData.longitude)) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    const lat = Number(nodeData.latitude);
    const lng = Number(nodeData.longitude);
    const existingNodes = await Node.find({}, { location: 1 });

    if (isTooClose(lat, lng, existingNodes, undefined, RADIUS)) {
      // Find the actual distance
      let distance = 0;
      for (const n of existingNodes) {
        if (n.location?.coordinates) {
          const [lng2, lat2] = n.location.coordinates;
          const dist = getDistance(lat, lng, lat2, lng2);
          if (dist < RADIUS) {
            distance = dist;
            break;
          }
        }
      }
      
      return Response.json(
        { 
          error: `Another node exists within ${RADIUS} meters`,
          distance_m: Number(distance.toFixed(2))
        },
        { status: 400 }
      );
    }

    const [seq] = await getNextSequences(nodeData.node_category, 1);
    const node = await Node.create({
      ...nodeData,
      latitude: lat,
      longitude: lng,
      location: createLocationObject(lat, lng),
      node_id: `${getShortCategoryName(nodeData.node_category)}-${String(seq).padStart(5, "0")}`,
    });

    return Response.json(node);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================================
   🔄 PUT: Update Node (with location protection)
================================ */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body._id) {
      return Response.json({ error: "Missing _id" }, { status: 400 });
    }

    const existingNode = await Node.findById(body._id);
    if (!existingNode) {
      return Response.json({ error: "Node not found" }, { status: 404 });
    }

    const updateData = buildBaseUpdateData(body);
    const isLocationUpdating = body.latitude !== undefined && body.longitude !== undefined;

    if (isLocationUpdating) {
      const newLat = Number(body.latitude);
      const newLng = Number(body.longitude);

      if (isNaN(newLat) || isNaN(newLng)) {
        return Response.json({ error: "Invalid coordinates" }, { status: 400 });
      }

      const otherNodes = await Node.find(
        { _id: { $ne: body._id } },
        { location: 1, _id: 1 }
      );

      const tooCloseToOtherNode = isTooClose(newLat, newLng, otherNodes, body._id, RADIUS);

      if (tooCloseToOtherNode) {
        preserveExistingLocation(existingNode, updateData);
        console.log(`📍 Location update blocked for node ${existingNode.node_id} - within ${RADIUS}m of existing node`);
      } else {
        updateData.latitude = newLat;
        updateData.longitude = newLng;
        updateData.location = createLocationObject(newLat, newLng);
      }
    }

    const updated = await Node.findByIdAndUpdate(
      body._id,
      { $set: sanitizeUpdateData(updateData) },
      { returnDocument: "after", runValidators: true }
    );

    return Response.json(updated);
  } catch (error: any) {
    console.error("PUT Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================================
   ❌ DELETE: Remove Node
================================ */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id) {
      return Response.json({ error: "Missing ID" }, { status: 400 });
    }

    await Node.findByIdAndDelete(body.id);
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}