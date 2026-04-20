import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Link from '@/models/Link';

// 🌍 Haversine (km)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// 📏 Distance
async function calculateDistance(fromId, toId) {
  const nodes = await Node.find({
    _id: { $in: [fromId, toId] }
  });

  const from = nodes.find(n => n._id.toString() === fromId.toString());
  const to = nodes.find(n => n._id.toString() === toId.toString());

  if (!from || !to) throw new Error("Node not found");

  if (
    from.latitude == null ||
    from.longitude == null ||
    to.latitude == null ||
    to.longitude == null
  ) {
    return 0;
  }

  return distanceKm(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );
}

// 🔄 Normalize pair
function normalizePair(a, b) {
  return [a.toString(), b.toString()].sort().join('_');
}

// ✅ GET
export async function GET() {
  try {
    await connectDB();

    const links = await Link.find()
      .populate('from_node')
      .populate('to_node')
      .sort({ createdAt: -1 });

    return Response.json(links);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ✅ CREATE / UPSERT LINK (SAFE)
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const { from, to } = body;

    if (!from || !to) {
      return new Response(JSON.stringify({ error: "Missing node IDs" }), { status: 400 });
    }

    if (from === to) {
      return new Response(JSON.stringify({ error: "Cannot link same node" }), { status: 400 });
    }

    const pair = normalizePair(from, to);

    const fiber_core = Number(body.fiber_core) || 12;
    const used_core = Number(body.used_core) || 0;

    if (used_core > fiber_core) {
      return new Response(JSON.stringify({
        error: "Used core cannot exceed total core"
      }), { status: 400 });
    }

    const length = await calculateDistance(from, to);

    // 🔥 UPSERT (no race condition)
    const link = await Link.findOneAndUpdate(
      { node_pair: pair },
      {
        from_node: from,
        to_node: to,
        node_pair: pair,

        fiber_core,
        used_core,
        fiber_type: body.fiber_type || 'GPON',
        status: body.status || 'planned',

        length: Number(length.toFixed(3))
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true
      }
    ).populate('from_node to_node');

    return Response.json(link);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ✅ UPDATE LINK (supports changing nodes)
export async function PUT(req) {
  try {
    await connectDB();
    const body = await req.json();

    const link = await Link.findById(body._id);
    if (!link) {
      return new Response(JSON.stringify({ error: "Link not found" }), { status: 404 });
    }

    const from = body.from || link.from_node;
    const to = body.to || link.to_node;

    if (from.toString() === to.toString()) {
      return new Response(JSON.stringify({ error: "Cannot link same node" }), { status: 400 });
    }

    const pair = normalizePair(from, to);

    const fiber_core = Number(body.fiber_core) || link.fiber_core;
    const used_core = Number(body.used_core) || link.used_core;

    if (used_core > fiber_core) {
      return new Response(JSON.stringify({
        error: "Used core cannot exceed total core"
      }), { status: 400 });
    }

    const length = await calculateDistance(from, to);

    const updated = await Link.findOneAndUpdate(
      { _id: body._id },
      {
        from_node: from,
        to_node: to,
        node_pair: pair,

        fiber_core,
        used_core,
        fiber_type: body.fiber_type || link.fiber_type,
        status: body.status || link.status,

        length: Number(length.toFixed(3))
      },
      {
        returnDocument: 'after',
        runValidators: true
      }
    ).populate('from_node to_node');

    return Response.json(updated);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ✅ DELETE
export async function DELETE(req) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    await Link.findByIdAndDelete(body.id);

    return Response.json({ success: true });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}