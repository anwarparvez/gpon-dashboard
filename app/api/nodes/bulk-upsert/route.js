import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

export async function POST(req) {
  try {
    await connectDB();

    const { data } = await req.json();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const operations = data.map(item => {
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

    inserted = result.upsertedCount;
    updated = result.modifiedCount;

    return Response.json({
      inserted,
      updated,
      skipped
    });

  } catch (err) {
    console.error("❌ BULK ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}