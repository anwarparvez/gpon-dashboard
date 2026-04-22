import { connectDB } from "@/lib/mongodb";
import Zone from "@/models/Zone";
import Node from "@/models/Node";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connectDB();

  const { id } = await context.params;

  // ✅ validate
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const zone = await Zone.findById(id);

  if (!zone) {
    return Response.json({ error: "Zone not found" }, { status: 404 });
  }

  // 🔥 FIX OLD POLYGONS
  let ring = zone.geometry.coordinates[0];

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  const nodes = await Node.find({
    location: {
      $geoWithin: {
        $geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      },
    },
  });

  return Response.json(nodes);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connectDB();

  const { id } = await context.params;

  await Zone.findByIdAndDelete(id);

  return Response.json({ success: true });
}


// ✅ UPDATE (RENAME)
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connectDB();

  const { id } = await context.params; // 🔥 IMPORTANT (Next 16)

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return Response.json({ error: "Name required" }, { status: 400 });
  }

  const updated = await Zone.findByIdAndUpdate(
    id,
    { name: name.trim() },
    { new: true },
  );

  if (!updated) {
    return Response.json({ error: "Zone not found" }, { status: 404 });
  }

  return Response.json(updated);
}
