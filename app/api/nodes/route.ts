import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";

import { getShortCategoryName } from "@/lib/nodeUtils";
import {
  getNextSequences,
  normalizeNode,
} from "@/lib/nodeService.server";

/* =========================
   📌 CONFIG
========================= */
const RADIUS = 5; // meters

/* =========================
   📏 DISTANCE FUNCTION
========================= */
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

/* =========================
   🧾 TYPES
========================= */
type NodeInput = {
  node_id?: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  node_category: string;
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

/* =========================
   🔍 CHECK CLOSE NODE
========================= */
function findTooClose(
  lat: number,
  lng: number,
  nodes: any[]
): { found: boolean; distance: number } {
  for (const n of nodes) {
    if (!n.location?.coordinates) continue;

    const [lng2, lat2] = n.location.coordinates;

    const dist = getDistance(lat, lng, lat2, lng2);

    if (dist < RADIUS) {
      return { found: true, distance: dist };
    }
  }
  return { found: false, distance: 0 };
}

/* =========================
   ✅ GET: Fetch Nodes
========================= */
export async function GET() {
  try {
    await connectDB();

    const nodes = await Node.find().sort({ createdAt: -1 });

    return Response.json(nodes);
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

/* =========================
   🚀 POST: Insert / Bulk
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    /* =========================
       🚀 BULK INSERT
    ========================= */
    if (body.bulk) {

      const validItems: NodeInput[] = body.data
        .map(normalizeNode)
        .filter(
          (i: NodeInput) =>
            i.name &&
            !isNaN(Number(i.latitude)) &&
            !isNaN(Number(i.longitude))
        );

      const existingNodes = await Node.find({}, { location: 1 }).lean();

      const acceptedBatch: { lat: number; lng: number }[] = [];
      const filtered: NodeInput[] = [];
      const skippedNodes: SkipNode[] = [];

      for (const item of validItems) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);

        /* ===== DB CHECK ===== */
        const dbCheck = findTooClose(lat, lng, existingNodes);

        /* ===== BATCH CHECK ===== */
        let batchTooClose = false;
        let batchDistance = 0;

        if (!dbCheck.found) {
          for (const b of acceptedBatch) {
            const dist = getDistance(lat, lng, b.lat, b.lng);
            if (dist < RADIUS) {
              batchTooClose = true;
              batchDistance = dist;
              break;
            }
          }
        }

        /* ===== SKIP ===== */
        if (dbCheck.found || batchTooClose) {
          skippedNodes.push({
            node_id: item.node_id,
            name: item.name,
            latitude: lat,
            longitude: lng,
            reason: dbCheck.found
              ? "Too close to existing node (DB)"
              : "Too close to another uploaded node",
            distance_m: Number(
              (dbCheck.found ? dbCheck.distance : batchDistance).toFixed(2)
            ),
          });
          continue;
        }

        acceptedBatch.push({ lat, lng });
        filtered.push(item);
      }

      /* =========================
         🔢 GROUP + GENERATE ID
      ========================= */
      const grouped: Record<string, NodeInput[]> = {};

      filtered.forEach((i) => {
        if (!grouped[i.node_category]) {
          grouped[i.node_category] = [];
        }
        grouped[i.node_category].push(i);
      });

      const finalInsert: any[] = [];

      for (const category in grouped) {
        const items = grouped[category];
        const seqs = await getNextSequences(category, items.length);

        items.forEach((item, idx) => {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);

          finalInsert.push({
            ...item,
            latitude: lat,
            longitude: lng,
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
        skipped: skippedNodes.length,
        radiusApplied: `${RADIUS}m`,
        skipped_nodes: skippedNodes,
      });
    }

    /* =========================
       ➕ SINGLE INSERT
    ========================= */
    const nodeData: NodeInput = normalizeNode(body);

    const lat = Number(nodeData.latitude);
    const lng = Number(nodeData.longitude);

    if (!nodeData.name || isNaN(lat) || isNaN(lng)) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    const existingNodes = await Node.find({}, { location: 1 }).lean();

    const check = findTooClose(lat, lng, existingNodes);

    if (check.found) {
      return Response.json(
        {
          error: "Too close to existing node",
          distance_m: Number(check.distance.toFixed(2)),
        },
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
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

/* =========================
   🔄 PUT
========================= */
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
      { new: true, runValidators: true }
    );

    return Response.json(updated);
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

/* =========================
   ❌ DELETE
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.id) {
      return Response.json({ error: "Missing ID" }, { status: 400 });
    }

    await Node.findByIdAndDelete(body.id);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}