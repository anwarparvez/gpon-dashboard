import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";

import { getShortCategoryName } from "@/lib/nodeUtils";
import {
  getNextSequences,
  normalizeNode,
} from "@/lib/nodeService.server";

const RADIUS = 5; // meters

/* ================================
   📏 Distance Function (Haversine)
================================ */
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
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

/* ================================
   🔍 Check Nearby Nodes
================================ */
function isTooClose(lat: number, lng: number, nodes: any[]) {
  return nodes.some((n) => {
    if (!n.location?.coordinates) return false;

    const [lng2, lat2] = n.location.coordinates;
    return getDistance(lat, lng, lat2, lng2) < RADIUS;
  });
}

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

      // 🔥 Load existing nodes (only location)
      const existingNodes = await Node.find({}, { location: 1 });

      const acceptedBatch: any[] = [];
      const filtered: any[] = [];

      for (const item of validItems) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);

        // 🚫 Check against DB
        const tooCloseDB = isTooClose(lat, lng, existingNodes);

        // 🚫 Check inside same batch
        const tooCloseBatch = acceptedBatch.some((n) =>
          getDistance(lat, lng, n.lat, n.lng) < RADIUS
        );

        if (tooCloseDB || tooCloseBatch) continue;

        acceptedBatch.push({ lat, lng });
        filtered.push(item);
      }

      // 🔢 group by category
      const grouped: Record<string, any[]> = {};

      filtered.forEach((i: any) => {
        if (!grouped[i.node_category]) {
          grouped[i.node_category] = [];
        }
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

            // ✅ GEOJSON FIX
            location: {
              type: "Point",
              coordinates: [lng, lat],
            },

            node_id: `${getShortCategoryName(category)}-${String(seqs[idx]).padStart(5, "0")}`,
          });
        });
      }

      const result = await Node.insertMany(finalInsert);

      return Response.json({
        inserted: result.length,
        skipped: body.data.length - result.length,
        radiusApplied: `${RADIUS}m`,
      });
    }

    /* ============================
       ➕ SINGLE INSERT
    ============================ */
    const nodeData = normalizeNode(body);

    if (
      !nodeData.name ||
      isNaN(nodeData.latitude) ||
      isNaN(nodeData.longitude)
    ) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    const lat = Number(nodeData.latitude);
    const lng = Number(nodeData.longitude);

    // 🔥 Load nearby nodes (optimization)
    const existingNodes = await Node.find({}, { location: 1 });

    const tooClose = isTooClose(lat, lng, existingNodes);

    if (tooClose) {
      return Response.json(
        { error: "Another node exists within 5 meters" },
        { status: 400 }
      );
    }

    const [seq] = await getNextSequences(nodeData.node_category, 1);

    const node = await Node.create({
      ...nodeData,
      latitude: lat,
      longitude: lng,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      node_id: `${getShortCategoryName(nodeData.node_category)}-${String(seq).padStart(5, "0")}`,
    });

    return Response.json(node);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================================
   🔄 PUT: Update Node
================================ */
export async function PUT(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const updated = await Node.findByIdAndUpdate(
      body._id,
      {
        name: body.name,
        node_category: body.node_category,
        status: body.status,
        dgm: body.dgm,
        region: body.region,
        node_code: body.node_code,
        address: body.address,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    return Response.json(updated);
  } catch (error: any) {
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