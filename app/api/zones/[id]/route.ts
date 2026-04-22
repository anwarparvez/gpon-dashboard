import { connectDB } from '@/lib/mongodb';
import Zone from '@/models/Zone';
import mongoose from 'mongoose';

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
