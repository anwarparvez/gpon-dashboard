import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import { setProgress } from '@/lib/migrateStore';

export async function POST() {
  await connectDB();

  setProgress({ running: true, processed: 0, updated: 0 });

  const total = await Node.countDocuments({
    latitude: { $ne: null },
    longitude: { $ne: null }
  });

  setProgress({ total });

  processBulk();

  return Response.json({ started: true });
}

// 🔥 BULK PROCESS
async function processBulk() {
  const batchSize = 500;
  let skip = 0;
  let processed = 0;
  let updated = 0;

  while (true) {
    const nodes = await Node.find({
      latitude: { $ne: null },
      longitude: { $ne: null }
    })
      .skip(skip)
      .limit(batchSize);

    if (nodes.length === 0) break;

    const bulkOps = [];

    for (const n of nodes) {
      if (
        n.location &&
        Array.isArray(n.location.coordinates) &&
        n.location.coordinates.length === 2
      ) continue;

      bulkOps.push({
        updateOne: {
          filter: { _id: n._id },
          update: {
            $set: {
              location: {
                type: "Point",
                coordinates: [n.longitude, n.latitude]
              }
            }
          }
        }
      });
    }

    if (bulkOps.length > 0) {
      const res = await Node.bulkWrite(bulkOps);
      updated += res.modifiedCount;
    }

    processed += nodes.length;
    skip += batchSize;

    setProgress({
      processed,
      updated
    });
  }

  setProgress({ running: false });
}