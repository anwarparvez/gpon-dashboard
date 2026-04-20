import { connectDB } from '@/lib/mongodb';
import Link from '@/models/Link';

export async function GET() {
  try {
    await connectDB();

    // 🔍 Populate node info
    const links = await Link.find()
      .populate('from_node')
      .populate('to_node');

    // 🧾 CSV Header
    let csv =
      "from_node_id,from_node_code,to_node_id,to_node_code,distance_km\n";

    for (const link of links) {
      const line = [
        link.from_node?.node_id || "",
        link.from_node?.node_code || "",
        link.to_node?.node_id || "",
        link.to_node?.node_code || "",
        link.length ?? ""
      ].join(",");

      console.log("📄", line); // debug log

      csv += line + "\n";
    }

    console.log(`✅ Exported ${links.length} links`);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=links_export.csv"
      }
    });

  } catch (error) {
    console.error("❌ EXPORT ERROR:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}