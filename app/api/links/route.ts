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
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 500 });
  }
}

/* =========================
   ✅ CREATE / UPSERT LINK
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { from, to } = body;

    if (!from || !to) {
      return new Response(JSON.stringify({
        error: "Missing node IDs"
      }), { status: 400 });
    }

    // 🔧 Load nodes
    const nodeMap = await getNodesMap([from, to]);

    const fromNode = nodeMap.get(from.toString());
    const toNode = nodeMap.get(to.toString());

    if (!fromNode || !toNode) {
      return new Response(JSON.stringify({
        error: "Node not found"
      }), { status: 404 });
    }

    // 🔥 DB VALIDATION
    await validateHODP(fromNode, toNode);

    // 🔥 GPON ENGINE
    const result = buildLink(fromNode, toNode, body);

    if (!result.valid) {
      return new Response(JSON.stringify({
        error: result.error
      }), { status: 400 });
    }

    // 🔒 Prevent duplicate
    const existingLink = await Link.findOne({
      node_pair: result.data.node_pair
    });

    if (existingLink) {
      return new Response(JSON.stringify({
        error: "Link already exists"
      }), { status: 409 });
    }

    const link = new Link(result.data);
    await link.save();
    await link.populate('from_node to_node');

    return Response.json(link);

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 500 });
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
      return new Response(JSON.stringify({
        error: "Link not found"
      }), { status: 404 });
    }

    const from = body.from || link.from_node;
    const to = body.to || link.to_node;

    const nodeMap = await getNodesMap([from, to]);

    const fromNode = nodeMap.get(from.toString());
    const toNode = nodeMap.get(to.toString());

    if (!fromNode || !toNode) {
      return new Response(JSON.stringify({
        error: "Node not found"
      }), { status: 404 });
    }

    // 🔥 HODP RULE
    await validateHODP(fromNode, toNode, link._id);

    // 🔥 GPON ENGINE
    const result = buildLink(fromNode, toNode, {
      fiber_core: body.fiber_core ?? link.fiber_core,
      used_core: body.used_core ?? link.used_core,
      status: body.status ?? link.status,
      fiber_type: body.fiber_type ?? link.fiber_type,
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
      {
        returnDocument: 'after',
        runValidators: true
      }
    ).populate('from_node to_node');

    return Response.json(updated);

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 500 });
  }
}

/* =========================
   ✅ DELETE LINK
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id) {
      return new Response(JSON.stringify({
        error: "Missing ID"
      }), { status: 400 });
    }

    await Link.findByIdAndDelete(body.id);

    return Response.json({ success: true });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message
    }), { status: 500 });
  }
}