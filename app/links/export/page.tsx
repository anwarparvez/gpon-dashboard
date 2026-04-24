"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ExportLinksPage() {
  const [loading, setLoading] = useState<string | null>(null);

  /* =========================
     📥 CSV DOWNLOAD (FIXED)
  ========================= */
  const downloadCSV = async (
    url: string,
    filename: string,
    key: string,
  ): Promise<void> => {
    try {
      setLoading(key);

      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Download failed");
        return;
      }

      const text = await res.text();

      // ✅ UTF-8 BOM FIX
      const blob = new Blob(["\uFEFF" + text], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (err: any) {
      console.error(err);
      alert("Download failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">📥 Export Network Data</h1>

      <Button
        disabled={loading === "links"}
        onClick={() => downloadCSV("/api/export-links", "links.csv", "links")}
      >
        ⬇️ Download Links
      </Button>

      <Button
        variant="secondary"
        disabled={loading === "suggestions"}
        onClick={() =>
          downloadCSV(
            "/api/network/suggestions?download=1",
            "suggested_links.csv",
            "suggestions",
          )
        }
      >
        ⚡ Suggested Links
      </Button>

      <Button
        variant="outline"
        disabled={loading === "nearest"}
        onClick={() =>
          downloadCSV("/api/network/nearest", "nearest_mapping.csv", "nearest")
        }
      >
        📍 Nearest Mapping
      </Button>

      <Button
        variant="destructive"
        disabled={loading === "odp"}
        onClick={() =>
          downloadCSV(
            "/api/network/unconnected-odp?download=1",
            "unconnected_odp.csv",
            "odp",
          )
        }
      >
        🔌 Unconnected ODP
      </Button>

      <Button
        variant="default"
        disabled={loading === "hodp"}
        onClick={() =>
          downloadCSV(
            "/api/network/unconnected-hodp-nearest?download=1",
            "unconnected_hodp_nearest_odp.csv",
            "hodp",
          )
        }
      >
        🧩 HODP → Nearest ODP
      </Button>
    </div>
  );
}
