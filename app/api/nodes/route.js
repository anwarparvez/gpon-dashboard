import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import Counter from '@/models/Counter';

/* ================================
   🔢 Atomic Counter for node_id
================================ */
async function getNextSequence(category) {
  const counter = await Counter.findOneAndUpdate(
    { category },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter.seq;
}

/* ================================
   📍 Duplicate Coordinate Check
================================ */
async function isDuplicateCoord(lat, lon) {
  return await Node.exists({
    latitude: lat,
    longitude: lon
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/* ================================
   ✅ POST: Insert / Bulk / Upsert
================================ */
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    /* ============================
       🔥 BULK UPSERT (UPDATE + INSERT)
       Match by node_id
    ============================ */
    if (body.bulkUpsert) {
      let skipped = 0;

      const operations = body.data.map(item => {
        if (!item.node_id) {
          skipped++;
          return null;
        }

        return {
          updateOne: {
            filter: { node_id: item.node_id },
            update: {
              $set: {
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                node_category: item.node_category,
                status: item.status,
                dgm: item.dgm,
                region: item.region,

                // 🆕 NEW FIELDS
                node_code: item.node_code,
                address: item.address
              }
            },
            upsert: true
          }
        };
      }).filter(Boolean);

      const result = await Node.bulkWrite(operations);

      return Response.json({
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        skipped
      });
    }

    /* ============================
       📦 BULK INSERT (AUTO ID)
    ============================ */
    if (body.bulk) {
      let inserted = [];
      let skipped = [];

      for (const item of body.data) {

        const name = item.name?.trim();
        const lat = Number(item.latitude);
        const lon = Number(item.longitude);
        const category = item.node_category || 'HODP';

        const status = item.status || 'proposed';
        const dgm = item.dgm || '';
        const region = item.region || '';

        const node_code = item.node_code || '';
        const address = item.address || '';

        if (!name || isNaN(lat) || isNaN(lon)) {
          skipped.push({ item, reason: 'Invalid data' });
          continue;
        }

        if (await isDuplicateCoord(lat, lon)) {
          skipped.push({ item, reason: 'Duplicate coordinates' });
          continue;
        }

        const seq = await getNextSequence(category);
        const node_id = `${category}-${String(seq).padStart(3, '0')}`;

        inserted.push({
          name,
          latitude: lat,
          longitude: lon,
          node_category: category,
          node_id,
          status,
          dgm,
          region,
          node_code,
          address
        });
      }

      const result = await Node.insertMany(inserted);

      return Response.json({
        inserted: result.length,
        skipped: skipped.length,
        skippedDetails: skipped
      });
    }

    /* ============================
       ➕ SINGLE INSERT
    ============================ */
    const name = body.name?.trim();
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const category = body.node_category || 'HODP';

    const status = body.status || 'proposed';
    const dgm = body.dgm || '';
    const region = body.region || '';

    const node_code = body.node_code || '';
    const address = body.address || '';

    if (!name || isNaN(lat) || isNaN(lon)) {
      return new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400 });
    }

    if (await isDuplicateCoord(lat, lon)) {
      return new Response(JSON.stringify({ error: 'Duplicate coordinates' }), { status: 400 });
    }

    const seq = await getNextSequence(category);
    const node_id = `${category}-${String(seq).padStart(3, '0')}`;

    const node = await Node.create({
      name,
      latitude: lat,
      longitude: lon,
      node_category: category,
      node_id,
      status,
      dgm,
      region,
      node_code,
      address
    });

    return Response.json(node);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/* ================================
   🔄 PUT: Update Node
================================ */
export async function PUT(req) {
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

        // 🆕 NEW FIELDS
        node_code: body.node_code,
        address: body.address
      },
      { returnDocument: 'after' }
    );

    return Response.json(updated);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/* ================================
   ❌ DELETE: Remove Node
================================ */
export async function DELETE(req) {
  try {
    await connectDB();

    const body = await req.json();

    await Node.findByIdAndDelete(body.id);

    return Response.json({ success: true });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}