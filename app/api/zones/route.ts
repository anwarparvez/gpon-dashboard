import { connectDB } from "@/lib/mongodb";
import Zone from "@/models/Zone";

export async function GET() {
  await connectDB();
  const zones = await Zone.find().sort({ createdAt: -1 });
  return Response.json(zones);
}

export async function POST(req: Request) {
  await connectDB();

  const { name, polygon } = await req.json();

  if (!name || !polygon || polygon.length < 3) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  // 🔄 convert to [lng, lat]
  let coords = polygon.map((p: any) => [p.lng, p.lat]);

  // 🔥 CLOSE POLYGON
  const first = coords[0];
  const last = coords[coords.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first);
  }

  const zone = await Zone.create({
    name,
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  });

  return Response.json(zone);
}
