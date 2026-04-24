import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import {
  processBulkUpsert,
  sanitizeUpdateData,
  getRadiusResponse
} from "@/lib/nodeDistance.server";

const { radiusMeters: RADIUS, radiusApplied: RADIUS_APPLIED } = getRadiusResponse();

export async function POST(req: Request) {
  try {
    await connectDB();
    const { data } = await req.json();

    if (!data || !Array.isArray(data)) {
      return Response.json(
        { error: "Invalid request: data array required" },
        { status: 400 }
      );
    }

    // Process bulk upsert with common logic
    const { operations, stats } = await processBulkUpsert(data, RADIUS);

    let inserted = 0;
    let updated = 0;

    if (operations.length > 0) {
      try {
        const result = await Node.bulkWrite(operations, { ordered: false });
        inserted = result.upsertedCount;
        updated = result.matchedCount - result.upsertedCount;

        console.log(`✅ Bulk write completed: ${inserted} inserted, ${updated} updated`);
      } catch (bulkError: any) {
        console.error("Bulk write error:", bulkError);

        // Fallback to individual updates
        console.log("🔄 Falling back to individual updates...");
        let successCount = 0;

        for (const op of operations) {
          try {
            const result = await Node.updateOne(
              op.updateOne.filter,
              op.updateOne.update,
              { upsert: op.updateOne.upsert }
            );

            if (result.upsertedId) {
              inserted++;
              successCount++;
            } else if (result.modifiedCount > 0) {
              updated++;
              successCount++;
            }
          } catch (individualError: any) {
            console.error(`Failed to update ${op.updateOne.filter.node_id}:`, individualError.message);
            stats.skipped++;
          }
        }

        console.log(`✅ Individual updates completed: ${successCount} successful`);
      }
    }

    return Response.json({
      inserted,
      updated,
      skipped: stats.skipped,
      locationSkipped: stats.locationSkipped,
      totalProcessed: data.length,
      validItems: stats.validItems,
      radiusApplied: RADIUS_APPLIED,
      message: `${stats.locationSkipped} node(s) had their location update blocked due to proximity restrictions (within ${RADIUS}m)`
    });

  } catch (err: any) {
    console.error("❌ BULK ERROR:", err);

    return Response.json(
      {
        error: err.message,
        details: err.code === 16755 ? "Geo index error: Invalid location data" : err.message
      },
      { status: 500 }
    );
  }
}