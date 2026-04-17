import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

// GET all nodes
export async function GET() {
  try {
    await connectDB();
    const nodes = await Node.find().sort({ createdAt: -1 });
    return Response.json(nodes);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// POST new node
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    // Count existing nodes of same category
    const count = await Node.countDocuments({
      node_category: body.node_category
    });

    const node_id = `${body.node_category}-${String(count + 1).padStart(3, '0')}`;

    const node = await Node.create({
      node_id,
      name: body.name,
      latitude: body.latitude,
      longitude: body.longitude,
      node_category: body.node_category
    });

    return Response.json(node);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

export async function PUT(req) {
  await connectDB();
  const body = await req.json();

  const updated = await Node.findByIdAndUpdate(
    body._id,
    body,
    { new: true }
  );

  return Response.json(updated);
}


export async function DELETE(req) {
  await connectDB();
  const body = await req.json();

  await Node.findByIdAndDelete(body.id);

  return Response.json({ success: true });
}