import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';

/* =========================
   🔄 CSV FORMAT
========================= */
function toCSV(rows) {
  const header = [
    "from_node",
    "to_node",
    "fiber_type",
    "fiber_core",
    "used_core",
    "length",
    "status",
    "note"
  ];

  const lines = rows.map(r => [
    r.from_node,
    r.to_node,
    r.fiber_type || "",
    r.fiber_core ?? "",
    r.used_core ?? 0,
    r.length ?? 0,
    r.status || "planned",
    `"${(r.note || "").replace(/"/g, '""')}"`
  ].join(","));

  return [header.join(","), ...lines].join("\n");
}

/* =========================
   ✅ GET
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download");

    // 🔥 Example data (replace with your logic)
    const rows = [
      {
        from_node: "OCC-01",
        to_node: "ODP-10",
        fiber_type: "feeder",
        fiber_core: 48,
        used_core: 0,
        length: 0.45,
        status: "planned",
        note: "Missing OCC"
      },
      {
        from_node: "ODP-10",
        to_node: "HODP-101",
        fiber_type: "distribution",
        fiber_core: 24,
        used_core: 0,
        length: 0.12,
        status: "planned",
        note: "Missing HODP"
      }
    ];

    /* =========================
       📥 DOWNLOAD CSV
    ========================= */
    if (download === "1") {
      const csv = toCSV(rows);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=suggestions.csv"
        }
      });
    }

    return Response.json({ data: rows });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}