"use client";

import { useState } from "react";
import Papa from "papaparse";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ImportNodes() {
  const [preview, setPreview] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);

  // ✅ VALIDATION
  const validateRow = (r: any) => {
    const errors: string[] = [];

    if (!r.node_id) errors.push("Missing node_id");

    if (r.latitude !== undefined) {
      if (isNaN(r.latitude) || r.latitude < -90 || r.latitude > 90) {
        errors.push("Invalid latitude");
      }
    }

    if (r.longitude !== undefined) {
      if (isNaN(r.longitude) || r.longitude < -180 || r.longitude > 180) {
        errors.push("Invalid longitude");
      }
    }

    return errors;
  };

  // 📂 FILE PARSE
  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const cols = results.meta.fields || [];
        setUploadedColumns(cols);

        // 🔧 CLEAN + VALIDATE
        const rows = results.data.map((r: any) => {
          const row: any = {};

          cols.forEach((col: string) => {
            let value = r[col];

            if (col === "latitude" || col === "longitude") {
              value = value ? parseFloat(value) : undefined;
            }

            row[col] = value?.toString().trim();
          });

          const errors = validateRow(row);

          return {
            ...row,
            errors,
            isValid: errors.length === 0,
          };
        });

        // 🔁 DUPLICATES
        const seen = new Set();
        const dup: string[] = [];

        rows.forEach((r: any) => {
          if (r.node_id && seen.has(r.node_id)) dup.push(r.node_id);
          else seen.add(r.node_id);
        });

        setDuplicates(dup);

        if (dup.length > 0) {
          alert("❌ Duplicate node_id in CSV");
          return;
        }

        // 🔍 FETCH DB
        const res = await fetch("/api/nodes");
        const dbNodes = await res.json();

        const map: any = {};
        dbNodes.forEach((n: any) => (map[n.node_id] = n));

        // 🔥 PREVIEW
        const result = rows.map((r: any) => {
          if (!r.isValid) {
            return { ...r, type: "error", log: "INVALID DATA" };
          }

          const existing = map[r.node_id];

          if (!existing) {
            return { ...r, type: "insert", log: "NEW NODE" };
          }

          const changes: any = {};

          // 🔥 ONLY CHECK UPLOADED COLUMNS
          uploadedColumns.forEach((key) => {
            if (
              r[key] !== undefined &&
              r[key] !== "" &&
              r[key] !== existing[key]
            ) {
              changes[key] = {
                old: existing[key],
                new: r[key],
              };
            }
          });

          if (Object.keys(changes).length === 0) {
            return { ...r, type: "skip", changes, log: "NO CHANGE" };
          }

          return { ...r, type: "update", changes, log: "UPDATED" };
        });

        setPreview(result);
        setLogs(result);
      },
    });
  };

  // 🚀 PARTIAL UPLOAD (ONLY CHANGED FIELDS)
  const handleUpload = async () => {
    setLoading(true);

    const payload = preview
      .filter((r) => r.isValid && r.type !== "skip")
      .map((r) => {
        if (r.type === "insert") {
          return r;
        }

        const obj: any = { node_id: r.node_id };

        Object.keys(r.changes || {}).forEach((key) => {
          obj[key] = r[key];
        });

        return obj;
      });

    if (payload.length === 0) {
      alert("❌ Nothing to upload");
      setLoading(false);
      return;
    }

    await fetch("/api/nodes/bulk-upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });

    alert(`✅ Uploaded ${payload.length} rows`);
    setLoading(false);
  };

  // 📥 DOWNLOAD LOG
  const downloadLog = () => {
    const csv = Papa.unparse(
      logs.map((l) => ({
        node_id: l.node_id,
        type: l.type,
        log: l.log,
        errors: l.errors?.join("; ") || "",
        changes: l.changes ? JSON.stringify(l.changes) : "",
      })),
    );

    const blob = new Blob([csv]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "import-log.csv";
    a.click();
  };

  // 📤 EXPORT
  const handleExport = async () => {
    setExporting(true);

    try {
      const res = await fetch("/api/nodes");
      const dbNodes = await res.json();

      if (!dbNodes.length) {
        alert("⚠️ No data found");
        setExporting(false);
        return;
      }

      // ✅ REQUIRED COLUMN ORDER
      const fields = [
        "node_id",
        "address",
        "dgm",
        "latitude",
        "longitude",
        "name",
        "node_category",
        "node_code",
        "region",
        "status",
      ];

      // ✅ MAP DATA (ENSURE ORDER + SAFE EMPTY)
      const formatted = dbNodes.map((n: any) => {
        const row: any = {};
        fields.forEach((f) => {
          row[f] = n[f] ?? "";
        });
        return row;
      });

      const csv = Papa.unparse({
        fields,
        data: formatted,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `nodes-export-${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("❌ Export failed");
    }

    setExporting(false);
  };

  const summary = {
    insert: preview.filter((r) => r.type === "insert").length,
    update: preview.filter((r) => r.type === "update").length,
    skip: preview.filter((r) => r.type === "skip").length,
    error: preview.filter((r) => r.type === "error").length,
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📂 Import / Export Nodes (Safe Update)</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <input type="file" onChange={handleFile} />

            <Button onClick={handleExport} variant="secondary">
              {exporting ? "Exporting..." : "📤 Export"}
            </Button>
          </div>

          {duplicates.length > 0 && (
            <Badge variant="destructive">
              Duplicate: {duplicates.join(", ")}
            </Badge>
          )}

          {preview.length > 0 && (
            <div className="flex gap-2 text-sm">
              <Badge>Insert: {summary.insert}</Badge>
              <Badge variant="secondary">Update: {summary.update}</Badge>
              <Badge variant="outline">Skip: {summary.skip}</Badge>
              <Badge variant="destructive">Error: {summary.error}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview (Only Uploaded Columns Compared)</CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Errors</th>
                    <th>Changes</th>
                  </tr>
                </thead>

                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td>{row.node_id}</td>

                      <td>
                        <Badge
                          variant={
                            row.type === "insert"
                              ? "default"
                              : row.type === "update"
                                ? "secondary"
                                : row.type === "skip"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {row.type}
                        </Badge>
                      </td>

                      <td className="text-red-500">{row.errors?.join(", ")}</td>

                      <td>
                        {Object.entries(row.changes || {}).map(
                          ([k, v]: any) => (
                            <div key={k}>
                              <b>{k}</b>: {v.old} → {v.new}
                            </div>
                          ),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleUpload}>
                {loading ? "Processing..." : "🚀 Upload"}
              </Button>

              <Button variant="outline" onClick={downloadLog}>
                📥 Download Log
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
