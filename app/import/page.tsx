"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

type NodeCategory = 'OLT' | 'OCC' | 'ODP' | 'HODP' | 'Branch Point';

export default function ImportNodes() {
  const [preview, setPreview] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [radiusMeters, setRadiusMeters] = useState<number>(5);

  // Category order for sorting
  const categoryOrder: Record<NodeCategory, number> = {
    'OLT': 1,
    'OCC': 2,
    'ODP': 3,
    'HODP': 4,
    'Branch Point': 5
  };

  // Fetch radius configuration from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          setRadiusMeters(config.radiusMeters || 5);
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    };
    
    fetchConfig();
  }, []);

  // ✅ VALIDATION
  const validateRow = (r: any, rowIndex: number) => {
    const errors: string[] = [];
    const fieldErrors: ValidationError[] = [];

    if (!r.node_id) {
      errors.push("Missing node_id");
      fieldErrors.push({ row: rowIndex, field: "node_id", error: "Missing node_id" });
    }

    if (!r.name) {
      errors.push("Missing name");
      fieldErrors.push({ row: rowIndex, field: "name", error: "Missing name" });
    }

    if (r.latitude !== undefined && r.latitude !== "") {
      const lat = parseFloat(r.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push("Invalid latitude");
        fieldErrors.push({ row: rowIndex, field: "latitude", error: "Invalid latitude (must be -90 to 90)" });
      }
    } else {
      errors.push("Missing latitude");
      fieldErrors.push({ row: rowIndex, field: "latitude", error: "Missing latitude" });
    }

    if (r.longitude !== undefined && r.longitude !== "") {
      const lng = parseFloat(r.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push("Invalid longitude");
        fieldErrors.push({ row: rowIndex, field: "longitude", error: "Invalid longitude (must be -180 to 180)" });
      }
    } else {
      errors.push("Missing longitude");
      fieldErrors.push({ row: rowIndex, field: "longitude", error: "Missing longitude" });
    }

    return { errors, fieldErrors };
  };

  // 📂 FILE PARSE
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadResult(null);
    setValidationErrors([]);
    setPreview([]);
    setLogs([]);
    setDuplicates([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const cols = results.meta.fields || [];
        setUploadedColumns(cols);

        // 🔧 CLEAN + VALIDATE
        const rows = results.data.map((r: any, idx: number) => {
          const row: any = {};

          cols.forEach((col: string) => {
            let value = r[col];

            if (value === "" || value === undefined) {
              row[col] = undefined;
            } else if (col === "latitude" || col === "longitude") {
              row[col] = parseFloat(value);
            } else {
              row[col] = value?.toString().trim();
            }
          });

          const { errors, fieldErrors } = validateRow(row, idx + 2);
          setValidationErrors(prev => [...prev, ...fieldErrors]);

          return {
            ...row,
            errors,
            isValid: errors.length === 0,
          };
        });

        // 🔁 DUPLICATES CHECK IN CSV
        const seen = new Set();
        const dup: string[] = [];

        rows.forEach((r: any) => {
          if (r.node_id && seen.has(r.node_id)) {
            dup.push(r.node_id);
          } else if (r.node_id) {
            seen.add(r.node_id);
          }
        });

        setDuplicates(dup);

        if (dup.length > 0) {
          alert(`❌ Duplicate node_id in CSV: ${dup.join(", ")}`);
          return;
        }

        // 🔍 FETCH DB NODES
        try {
          const res = await fetch("/api/nodes");
          if (!res.ok) throw new Error("Failed to fetch existing nodes");
          const dbNodes = await res.json();

          const map: any = {};
          dbNodes.forEach((n: any) => (map[n.node_id] = n));

          // 🔥 PREVIEW WITH CHANGES
          const result = rows.map((r: any) => {
            if (!r.isValid) {
              return { ...r, type: "error", log: "INVALID DATA", changes: {} };
            }

            const existing = map[r.node_id];

            if (!existing) {
              return { ...r, type: "insert", log: "NEW NODE", changes: {} };
            }

            const changes: any = {};

            // 🔥 ONLY CHECK UPLOADED COLUMNS
            uploadedColumns.forEach((key) => {
              const newValue = r[key];
              const oldValue = existing[key];

              if (newValue !== undefined && newValue !== "" && newValue !== oldValue) {
                changes[key] = {
                  old: oldValue ?? "",
                  new: newValue,
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
        } catch (error) {
          console.error("Failed to fetch existing nodes:", error);
          alert("Failed to fetch existing nodes from database");
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Failed to parse CSV file");
      },
    });
  };

  // 🚀 UPLOAD WITH PROGRESS
  const handleUpload = async () => {
    setLoading(true);
    setUploadResult(null);
    setUploadProgress(0);

    const payload = preview
      .filter((r) => r.isValid && r.type !== "skip")
      .map((r) => {
        const obj: any = {
          node_id: r.node_id,
          name: r.name,
          latitude: r.latitude,
          longitude: r.longitude,
        };

        const optionalFields = ['node_category', 'status', 'dgm', 'region', 'node_code', 'address'];
        optionalFields.forEach(field => {
          if (r[field] !== undefined && r[field] !== "") {
            obj[field] = r[field];
          }
        });

        if (r.type === "update" && r.changes) {
          Object.keys(r.changes).forEach(key => {
            if (key !== 'node_id' && key !== 'latitude' && key !== 'longitude' && key !== 'name') {
              obj[key] = r.changes[key].new;
            }
          });
        }

        return obj;
      });

    if (payload.length === 0) {
      alert("❌ Nothing to upload");
      setLoading(false);
      return;
    }

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const res = await fetch("/api/nodes/bulk-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await res.json();
      setUploadResult(result);

      if (res.ok) {
        const successMessage = [
          "✅ Upload Complete!",
          `📊 Total Processed: ${payload.length}`,
          `✨ Inserted: ${result.inserted}`,
          `🔄 Updated: ${result.updated}`,
          `⏭️ Skipped: ${result.skipped}`,
          result.locationSkipped > 0 ? `📍 Location Updates Blocked: ${result.locationSkipped}` : null,
          `📏 Radius: ${result.radiusApplied || `${radiusMeters} meters`}`,
        ].filter(Boolean).join("\n");
        
        alert(successMessage);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(`❌ Upload failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("❌ Failed to upload data");
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // 📥 DOWNLOAD LOG
  const downloadLog = () => {
    const csv = Papa.unparse(
      logs.map((l) => ({
        node_id: l.node_id,
        name: l.name,
        latitude: l.latitude,
        longitude: l.longitude,
        type: l.type,
        log: l.log,
        errors: l.errors?.join("; ") || "",
        changes: l.changes ? JSON.stringify(l.changes) : "",
        node_category: l.node_category,
        status: l.status,
        dgm: l.dgm,
        region: l.region,
        node_code: l.node_code,
        address: l.address,
      })),
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `import-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 📤 EXPORT - ORDERED BY CATEGORY: OLT, OCC, ODP, HODP
  const handleExport = async () => {
    setExporting(true);

    try {
      const res = await fetch("/api/nodes");
      if (!res.ok) throw new Error("Failed to fetch nodes");
      
      let dbNodes = await res.json();

      if (!dbNodes.length) {
        alert("⚠️ No data found");
        setExporting(false);
        return;
      }

      // Sort nodes by category order: OLT -> OCC -> ODP -> HODP -> Branch Point
      dbNodes = dbNodes.sort((a: any, b: any) => {
        const orderA = categoryOrder[a.node_category as NodeCategory] || 999;
        const orderB = categoryOrder[b.node_category as NodeCategory] || 999;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // If same category, sort by node_id
        return a.node_id.localeCompare(b.node_id);
      });

      const fields = [
        "node_id",
        "name",
        "latitude",
        "longitude",
        "node_category",
        "status",
        "dgm",
        "region",
        "node_code",
        "address",
      ];

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
      a.download = `nodes-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Show category breakdown in success message
      const categoryBreakdown = dbNodes.reduce((acc: any, node: any) => {
        const cat = node.node_category;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      
      const breakdownMessage = Object.entries(categoryBreakdown)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(", ");
      
      alert(`✅ Export completed successfully!\n📊 Total nodes: ${dbNodes.length}\n📋 ${breakdownMessage}`);
    } catch (err) {
      console.error(err);
      alert("❌ Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleClear = () => {
    setPreview([]);
    setLogs([]);
    setDuplicates([]);
    setUploadedColumns([]);
    setUploadResult(null);
    setValidationErrors([]);
    setFileName("");
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const summary = {
    insert: preview.filter((r) => r.type === "insert").length,
    update: preview.filter((r) => r.type === "update").length,
    skip: preview.filter((r) => r.type === "skip").length,
    error: preview.filter((r) => r.type === "error").length,
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>📂 Import / Export Nodes (Safe Update)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload CSV files to bulk insert or update nodes. Location updates within{' '}
            <span className="font-semibold text-primary">{radiusMeters} meters</span> of existing nodes are automatically blocked.
          </p>
          <p className="text-xs text-muted-foreground">
            Export orders nodes by: OLT → OCC → ODP → HODP → Branch Point
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1">
              <input 
                id="file-input"
                type="file" 
                accept=".csv" 
                onChange={handleFile} 
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {fileName}
                </p>
              )}
            </div>

            <Button onClick={handleExport} variant="secondary" disabled={exporting}>
              {exporting ? "Exporting..." : "📤 Export (Ordered)"}
            </Button>

            {preview.length > 0 && (
              <Button onClick={handleClear} variant="outline">
                🗑️ Clear
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/20">
            📏 Proximity Protection: Active (Radius = {radiusMeters} meters)
          </div>

          {duplicates.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ Duplicate node_id in CSV: {duplicates.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-semibold">Validation Errors Found:</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {validationErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.field} - {err.error}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li>... and {validationErrors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div className="flex gap-2 text-sm flex-wrap items-center">
              <Badge variant="default">✨ Insert: {summary.insert}</Badge>
              <Badge variant="secondary">🔄 Update: {summary.update}</Badge>
              <Badge variant="outline">⏭️ Skip: {summary.skip}</Badge>
              <Badge variant="destructive">❌ Error: {summary.error}</Badge>
              <span className="text-xs text-muted-foreground ml-2">
                Total: {preview.length} rows
              </span>
            </div>
          )}

          {uploadResult && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">📊 Upload Results:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>✅ Inserted: {uploadResult.inserted}</p>
                    <p>🔄 Updated: {uploadResult.updated}</p>
                    <p>⏭️ Skipped: {uploadResult.skipped}</p>
                    {uploadResult.locationSkipped > 0 && (
                      <p>📍 Location blocked: {uploadResult.locationSkipped}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    📏 Proximity radius: {uploadResult.radiusApplied || `${radiusMeters} meters`}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Processing... {uploadProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview Data
              <span className="text-sm font-normal ml-2 text-muted-foreground">
                Showing {preview.length} rows
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="table">
              <TabsList className="mb-4">
                <TabsTrigger value="table">📊 Table View</TabsTrigger>
                <TabsTrigger value="summary">📈 Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="table">
                <ScrollArea className="h-[500px] rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background shadow-sm">
                      <tr className="border-b">
                        <th className="text-left p-2 w-32">ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2 w-24">Category</th>
                        <th className="text-left p-2 w-24">Status</th>
                        <th className="text-left p-2 w-32">Errors</th>
                        <th className="text-left p-2">Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{row.node_id}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {row.node_category || '—'}
                            </Badge>
                          </td>
                          <td className="p-2">
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
                              className="text-xs"
                            >
                              {row.type === "insert" && "✨ INSERT"}
                              {row.type === "update" && "🔄 UPDATE"}
                              {row.type === "skip" && "⏭️ SKIP"}
                              {row.type === "error" && "❌ ERROR"}
                            </Badge>
                           </td>
                          <td className="p-2 text-red-500 text-xs">
                            {row.errors?.join(", ")}
                           </td>
                          <td className="p-2 text-xs">
                            {Object.entries(row.changes || {}).map(
                              ([k, v]: any) => (
                                <div key={k} className="mb-1">
                                  <span className="font-semibold">{k}:</span>{" "}
                                  <span className="line-through text-red-500">{v.old}</span>
                                  {" → "}
                                  <span className="text-green-600">{v.new}</span>
                                </div>
                              ),
                            )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="summary">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{summary.insert}</div>
                        <p className="text-sm text-muted-foreground">New Inserts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{summary.update}</div>
                        <p className="text-sm text-muted-foreground">Updates</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-600">{summary.skip}</div>
                        <p className="text-sm text-muted-foreground">Skipped (No Changes)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{summary.error}</div>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </CardContent>
                    </Card>
                  </div>

                  {uploadResult && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">Last Upload Results</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p>✅ Inserted: {uploadResult.inserted}</p>
                        <p>🔄 Updated: {uploadResult.updated}</p>
                        <p>⏭️ Skipped: {uploadResult.skipped}</p>
                        {uploadResult.locationSkipped > 0 && (
                          <p>📍 Location updates blocked: {uploadResult.locationSkipped}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? "Processing..." : "🚀 Upload to Database"}
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