"use client";

import { useState } from "react";

// shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";

export default function NearestODPPage() {
  const [nodes, setNodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 📥 Parse CSV
  const handleFile = async (file: File) => {
    console.log("📂 File selected:", file.name);

    const text = await file.text();

    const rows = text
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);

    // skip header
    const parsed = rows.slice(1);

    console.log("✅ Parsed node_ids:", parsed);

    setNodes(parsed);
  };

  // 🔍 Call API → Download CSV
  const handleSearch = async () => {
    if (!nodes.length) {
      alert("No node_id found in CSV");
      return;
    }

    setLoading(true);

    try {
      console.log("🚀 Sending nodes:", nodes);

      const res = await fetch("/api/nearest-odp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ node_ids: nodes })
      });

      console.log("📡 Response status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Error response:", text);
        alert("API error");
        setLoading(false);
        return;
      }

      // 🔥 Get CSV blob
      const blob = await res.blob();

      // 🔽 Download file
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "nearest_odp_result.csv";
      a.click();

      console.log("✅ CSV downloaded");

    } catch (err) {
      console.error("🔥 Request failed:", err);
      alert("Request failed");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">📍 Nearest ODP Finder</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV (node_id list) and download nearest ODP results
        </p>
      </div>

      {/* UPLOAD CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Processing..." : "🔍 Find & Download CSV"}
          </Button>

        </CardContent>
      </Card>

      {/* PREVIEW */}
      {nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({nodes.length} nodes)</CardTitle>
          </CardHeader>

          <CardContent className="text-sm space-y-1 max-h-40 overflow-auto">
            {nodes.slice(0, 20).map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}