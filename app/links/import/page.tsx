"use client";

import { useState } from "react";

// shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Table, TableHeader, TableRow,
  TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ✅ Types
type PreviewRow = {
  from_node: string;
  to_node: string;
  fiber_core?: number;
  used_core?: number;
  fiber_type?: string;
  length?: number;
  status?: string;

  status_check: "ok" | "update" | "error";
  error?: string;
};

type Summary = {
  total: number;
  valid: number;
  invalid: number;
  updates?: number;
  inserted?: number;
};

export default function ImportLinks() {

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  // 👀 PREVIEW
  const handlePreview = async () => {
    if (!file) return alert("Select CSV file");

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const res = await fetch("/api/import-links", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setPreview(data?.preview || []);
      setSummary(data?.summary || null);

    } catch (err) {
      console.error(err);
      alert("Preview failed");
    }

    setLoading(false);
  };

  // 🚀 IMPORT
  const handleImport = async () => {
    if (!file) return alert("Select file");

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");

      const res = await fetch("/api/import-links", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      alert(`✅ Inserted: ${data?.summary?.inserted ?? 0}`);

      setPreview([]);
      setSummary(null);
      setFile(null);

    } catch (err) {
      console.error(err);
      alert("Import failed");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">📥 Import Links</h1>
        <p className="text-sm text-muted-foreground">
          GPON-aware CSV import with validation + distance
        </p>
      </div>

      {/* UPLOAD */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFile(file);
            }}
          />

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={loading}>
              👀 Preview
            </Button>

            <Button onClick={handleImport} disabled={loading}>
              ✅ Import
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* SUMMARY */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>

          <CardContent className="flex gap-6 text-sm">
            <div>Total: <b>{summary.total}</b></div>

            <div className="text-green-600">
              Valid: <b>{summary.valid}</b>
            </div>

            <div className="text-yellow-500">
              Updates: <b>{summary.updates ?? 0}</b>
            </div>

            <div className="text-red-600">
              Invalid: <b>{summary.invalid}</b>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABLE */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>

          <CardContent className="overflow-auto">

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Core</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Distance (km)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>

                    <TableCell>{row.from_node}</TableCell>
                    <TableCell>{row.to_node}</TableCell>

                    <TableCell>
                      {row.fiber_type ? (
                        <Badge variant="outline">
                          {row.fiber_type}
                        </Badge>
                      ) : "-"}
                    </TableCell>

                    <TableCell>{row.fiber_core ?? "-"}</TableCell>
                    <TableCell>{row.used_core ?? "-"}</TableCell>

                    <TableCell>
                      {row.length ? row.length.toFixed(2) : "-"}
                    </TableCell>

                    <TableCell>
                      {row.status_check === "ok" && (
                        <Badge className="bg-green-600">New</Badge>
                      )}

                      {row.status_check === "update" && (
                        <Badge className="bg-yellow-500">Update</Badge>
                      )}

                      {row.status_check === "error" && (
                        <Badge variant="destructive">
                          {row.error}
                        </Badge>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>

            </Table>

          </CardContent>
        </Card>
      )}

    </div>
  );
}