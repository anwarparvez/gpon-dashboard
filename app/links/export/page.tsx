"use client";

import { Button } from "@/components/ui/button";

export default function ExportLinksPage() {

  // 🔽 Export existing links
  const handleDownloadLinks = async () => {
    try {
      const res = await fetch("/api/export-links");

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "links_export.csv";
      a.click();

    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  };

  // 🔽 Export suggested links (NEW)
  const handleDownloadSuggestions = async () => {
    try {
      const res = await fetch("/api/network/suggestions?download=1");

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        alert("Suggestion export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "suggested_links.csv";
      a.click();

    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  };

  return (
    <div className="p-6 space-y-4">

      <h1 className="text-xl font-bold">📥 Export Network Data</h1>

      {/* 🔹 Existing Links */}
      <Button onClick={handleDownloadLinks}>
        ⬇️ Download Link CSV
      </Button>

      {/* 🔹 Suggested Links */}
      <Button
        variant="secondary"
        onClick={handleDownloadSuggestions}
      >
        ⚡ Download Suggested Links CSV
      </Button>

    </div>
  );
}