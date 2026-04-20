"use client";

import { Button } from "@/components/ui/button";

export default function ExportLinksPage() {

  const handleDownload = async () => {
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

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📥 Export Links</h1>

      <Button onClick={handleDownload}>
        ⬇️ Download Link CSV
      </Button>
    </div>
  );
}