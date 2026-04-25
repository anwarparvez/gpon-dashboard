import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';

import { buildLink } from '@/lib/gponRules';
import { validateHODP } from '@/lib/linkUtils';

import { Types } from "mongoose";

/* =========================
   🔧 Load nodes helper
========================= */
async function getNodesMap(ids: (string | Types.ObjectId)[]) {
  const nodes = await Node.find({ _id: { $in: ids } });
  return new Map<string, any>(
    nodes.map(n => [n._id.toString(), n])
  );
}

/* =========================
   ✅ GET ALL LINKS
========================= */
export async function GET() {
  try {
    await connectDB();
    const links = await Link.find()
      .populate('from_node')
      .populate('to_node')
      .sort({ createdAt: -1 });
    return Response.json(links);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/* =========================
   ✅ CREATE / UPSERT LINK
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    console.log("📦 Received link payload:", body); // Debug log

    // Accept both naming styles
    const fromId = body.from || body.from_node;
    const toId = body.to || body.to_node;

    if (!fromId || !toId) {
      console.error("Missing from/to:", { fromId, toId, body });
      return Response.json(
        { error: "Missing 'from' and 'to' node identifiers" },
        { status: 400 }
      );
    }

    // Load nodes
    const [fromNode, toNode] = await Promise.all([
      Node.findById(fromId).lean(),
      Node.findById(toId).lean(),
    ]);

    if (!fromNode || !toNode) {
      return Response.json(
        { error: `Node not found: ${!fromNode ? fromId : toId}` },
        { status: 404 }
      );
    }

    // 1. HODP business rule validation
    try {
      await validateHODP(fromNode, toNode);
    } catch (err: any) {
      console.error("validateHODP failed:", err.message);
      return Response.json({ error: err.message }, { status: 400 });
    }

    // 2. GPON rule engine (buildLink)
    const payload = {
      fiber_core: body.fiber_core ?? 12,
      used_core: body.used_core ?? 0,
      fiber_type: body.fiber_type ?? "SMF",
      length: body.length ?? 0,          // in meters (frontend sends km? we convert below)
      status: body.status ?? "planned",
      note: body.note ?? "",
    };

    // Convert length from kilometers to meters if needed
    if (body.length_km) {
      payload.length = body.length_km * 1000;
    }

    const result = buildLink(fromNode, toNode, payload);

    if (!result.valid) {
      console.error("buildLink invalid:", result.error);
      return Response.json({ error: result.error }, { status: 400 });
    }

    // Prepare final document
    const linkData = {
      ...result.data,
      // Ensure node_pair is unique (example: "fromId-toId" sorted)
      node_pair: [fromId.toString(), toId.toString()].sort().join("-"),
    };

    // Check duplicate
    const existing = await Link.findOne({ node_pair: linkData.node_pair });
    if (existing) {
      return Response.json(
        { error: "Link already exists between these nodes" },
        { status: 409 }
      );
    }

    const link = new Link(linkData);
    await link.save();
    await link.populate("from_node to_node");

    console.log("✅ Link created:", link._id);
    return Response.json(link);
  } catch (error: any) {
    console.error("POST /api/links ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* =========================
   ✅ UPDATE LINK
========================= */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const link = await Link.findById(body._id);
    if (!link) {
      return new Response(JSON.stringify({ error: "Link not found" }), { status: 404 });
    }

    const fromId = body.from || body.from_node || link.from_node;
    const toId = body.to || body.to_node || link.to_node;

    const nodeMap = await getNodesMap([fromId, toId]);
    const fromNode = nodeMap.get(fromId.toString());
    const toNode = nodeMap.get(toId.toString());

    if (!fromNode || !toNode) {
      return new Response(JSON.stringify({
        error: "Node not found"
      }), { status: 404 });
    }

    // HODP rule
    try {
      await validateHODP(fromNode, toNode, link._id);
    } catch (validationError: any) {
      return new Response(JSON.stringify({
        error: validationError.message
      }), { status: 400 });
    }

    // GPON engine
    const result = buildLink(fromNode, toNode, {
      fiber_core: body.fiber_core ?? link.fiber_core,
      used_core: body.used_core ?? link.used_core,
      status: body.status ?? link.status,
      fiber_type: body.fiber_type ?? link.fiber_type,
      length: body.length ?? link.length,
      note: body.note ?? link.note
    });

    if (!result.valid) {
      return new Response(JSON.stringify({
        error: result.error
      }), { status: 400 });
    }

    const updated = await Link.findByIdAndUpdate(
      body._id,
      result.data,
      { returnDocument: 'after', runValidators: true }
    ).populate('from_node to_node');

    return Response.json(updated);

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/* =========================
   ✅ DELETE LINK
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Support both id in body or query param
    const linkId = body.id || body._id;
    if (!linkId) {
      return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    await Link.findByIdAndDelete(linkId);
    return Response.json({ success: true });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}