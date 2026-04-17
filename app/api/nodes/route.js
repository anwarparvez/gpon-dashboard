import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Counter from '@/models/Counter';

// 🔥 Atomic counter
async function getNextSequence(category) {
  const counter = await Counter.findOneAndUpdate(
    { category },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return counter.seq;
}

// 🔹 Check duplicate coordinates
async function isDuplicateCoord(lat, lon) {
  return await Node.exists({
    latitude: lat,
    longitude: lon
  });
}

// ✅ GET
export async function GET() {
  try {
    console.log("📡 GET /api/nodes");

    await connectDB();

    const nodes = await Node.find().sort({ createdAt: -1 });

    console.log(`✅ Fetched ${nodes.length} nodes`);

    return Response.json(nodes);
  } catch (error) {
    console.error("❌ GET Error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

// ✅ POST
export async function POST(req) {
  try {
    console.log("📡 POST /api/nodes");

    await connectDB();
    const body = await req.json();

    // 🔥 BULK INSERT
    if (body.bulk) {
      console.log(`📥 Bulk import started: ${body.data.length} rows`);

      let inserted = [];
      let skipped = [];

      for (const [index, item] of body.data.entries()) {
        const name = item.name?.trim();
        const lat = Number(item.latitude);
        const lon = Number(item.longitude);
        const category = item.node_category || 'HODP';

        // ❌ Validation
        if (!name || isNaN(lat) || isNaN(lon)) {
          console.warn(`⚠ Row ${index + 1}: Invalid data`);
          skipped.push({ item, reason: 'Invalid data' });
          continue;
        }

        // ❌ Duplicate coordinate
        const existsCoord = await isDuplicateCoord(lat, lon);
        if (existsCoord) {
          console.warn(`⚠ Row ${index + 1}: Duplicate coordinate`);
          skipped.push({ item, reason: 'Duplicate coordinates' });
          continue;
        }

        // ✅ Generate ID
        const seq = await getNextSequence(category);
        const node_id = `${category}-${String(seq).padStart(3, '0')}`;

        console.log(`➕ Row ${index + 1}: ${node_id} (${name})`);

        inserted.push({
          name,
          latitude: lat,
          longitude: lon,
          node_category: category,
          node_id
        });
      }

      const result = await Node.insertMany(inserted);

      console.log(`✅ Bulk complete → Inserted: ${result.length}, Skipped: ${skipped.length}`);

      return Response.json({
        inserted: result.length,
        skipped: skipped.length,
        skippedDetails: skipped
      });
    }

    // 🔹 SINGLE INSERT
    const name = body.name?.trim();
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const category = body.node_category || 'HODP';

    if (!name || isNaN(lat) || isNaN(lon)) {
      console.warn("⚠ Invalid single insert data");

      return new Response(JSON.stringify({ error: 'Invalid data' }), {
        status: 400
      });
    }

    const existsCoord = await isDuplicateCoord(lat, lon);
    if (existsCoord) {
      console.warn("⚠ Duplicate coordinate (single insert)");

      return new Response(JSON.stringify({ error: 'Duplicate coordinates' }), {
        status: 400
      });
    }

    const seq = await getNextSequence(category);
    const node_id = `${category}-${String(seq).padStart(3, '0')}`;

    const node = await Node.create({
      name,
      latitude: lat,
      longitude: lon,
      node_category: category,
      node_id
    });

    console.log(`✅ Single insert: ${node_id} (${name})`);

    return Response.json(node);

  } catch (error) {
    console.error("❌ POST Error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

// ✅ PUT
export async function PUT(req) {
  try {
    console.log("📡 PUT /api/nodes");

    await connectDB();
    const body = await req.json();

    const updated = await Node.findByIdAndUpdate(
      body._id,
      {
        name: body.name,
        node_category: body.node_category
      },
      { new: true }
    );

    console.log(`✏ Updated node: ${updated.node_id}`);

    return Response.json(updated);

  } catch (error) {
    console.error("❌ PUT Error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

// ✅ DELETE
export async function DELETE(req) {
  try {
    console.log("📡 DELETE /api/nodes");

    await connectDB();
    const body = await req.json();

    await Node.findByIdAndDelete(body.id);

    console.log(`🗑 Deleted node: ${body.id}`);

    return Response.json({ success: true });

  } catch (error) {
    console.error("❌ DELETE Error:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}