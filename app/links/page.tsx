'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* =========================
   TYPES
========================= */

type LinkType = {
  _id: string;
  from_node: {
    _id: string;
    node_id: string;
    name: string;
    node_category: string;
    latitude?: number;
    longitude?: number;
  };
  to_node: {
    _id: string;
    node_id: string;
    name: string;
    node_category: string;
    latitude?: number;
    longitude?: number;
  };
  fiber_core?: number;
  used_core?: number;
  fiber_type?: string;
  length?: number;   // meters
  status?: string;   // 'active' or 'planned'
  createdAt?: string;
};

type NodeType = {
  _id: string;
  node_id: string;
  name: string;
  node_category: string;
  status: string;
  latitude?: number;
  longitude?: number;
  region?: string;
};

type SuggestedLink = {
  from_node: string;
  from_node_id: string;
  from_node_name: string;
  to_node: string;
  to_node_id: string;
  to_node_name: string;
  fiber_type: string;
  fiber_core: number;
  used_core: number;
  length_km: number;
  status: string;          // 'planned' for suggestions
  suggestion_type: string;
  priority: number;
  reason: string;
};

type PreviewRow = {
  from_node: string;
  to_node: string;
  fiber_core?: number;
  used_core?: number;
  fiber_type?: string;
  length?: number | string;
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

/* =========================
   COMPONENT
========================= */

export default function LinksPage() {
  // State for links table
  const [links, setLinks] = useState<LinkType[]>([]);
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  
  // State for import
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  // State for export
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  
  // State for nearest node features
  const [nearestLoading, setNearestLoading] = useState(false);
  const [nearestResults, setNearestResults] = useState<any>(null);
  
  // State for suggested links
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestProgress, setSuggestProgress] = useState(0);
  
  // State for delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkType | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch links and nodes on mount
  useEffect(() => {
    fetchLinks();
    fetchNodes();
  }, []);

  const fetchLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch('/api/links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoadingLinks(false);
    }
  };

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data);
      }
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
    }
  };

  /* =========================
     📥 EXPORT FUNCTIONS
  ========================= */
  
  const exportImportTemplate = async () => {
    try {
      setExportLoading("import-template");
      
      const headers = [
        'from_node', 'to_node', 'fiber_type', 'fiber_core',
        'used_core', 'length_km', 'status'
      ];
      
      const exampleRows = [
        { from_node: 'OLT-001', to_node: 'OCC-001', fiber_type: 'SMF', fiber_core: 24, used_core: 0, length_km: 2.5, status: 'active' },
        { from_node: 'OCC-001', to_node: 'ODP-001', fiber_type: 'SMF', fiber_core: 12, used_core: 0, length_km: 1.2, status: 'planned' },
        { from_node: 'ODP-001', to_node: 'HODP-101', fiber_type: 'SMF', fiber_core: 6, used_core: 0, length_km: 0.8, status: 'planned' }
      ];
      
      const csvRows = [headers.join(',')];
      for (const row of exampleRows) {
        const values = headers.map(h => {
          let val = row[h as keyof typeof row] ?? '';
          if (h === 'length_km' && typeof val === 'number') val = val.toFixed(3);
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }
      
      downloadCSVContent(csvRows.join('\n'), 'link_import_template.csv');
      alert('✅ Import template downloaded.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate import template');
    } finally {
      setExportLoading(null);
    }
  };
  
  const exportAllLinks = async () => {
    try {
      setExportLoading("all-links");
      const linksRes = await fetch('/api/links');
      const allLinks = await linksRes.json();
      
      const formattedLinks = allLinks.map((link: any) => ({
        from_node: link.from_node?.node_id || '',
        to_node: link.to_node?.node_id || '',
        fiber_type: link.fiber_type || 'SMF',
        fiber_core: link.fiber_core || 12,
        used_core: link.used_core || 0,
        length_km: link.length ? (link.length / 1000).toFixed(3) : '',
        status: link.status || 'planned'
      }));
      
      const csv = convertToCSV(formattedLinks, [
        'from_node', 'to_node', 'fiber_type', 'fiber_core', 
        'used_core', 'length_km', 'status'
      ]);
      downloadCSVContent(csv, 'all_links_export.csv');
      alert('✅ Exported all existing links.');
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setExportLoading(null);
    }
  };
  
  const downloadCSV = async (url: string, filename: string, key: string) => {
    try {
      setExportLoading(key);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const text = await res.text();
      downloadCSVContent(text, filename);
    } catch (err) {
      console.error(err);
      alert("Download failed");
    } finally {
      setExportLoading(null);
    }
  };
  
  const downloadCSVContent = (content: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  /* =========================
     🔍 NEAREST NODE FEATURES
  ========================= */
  
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  
  const findNearestOltForOcc = (occ: NodeType, olts: NodeType[]) => {
    let nearest = null;
    let minDistance = Infinity;
    for (const olt of olts) {
      if (olt.latitude && olt.longitude && occ.latitude && occ.longitude) {
        const distance = calculateDistance(olt.latitude, olt.longitude, occ.latitude, occ.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = olt;
        }
      }
    }
    return { nearest, distance: minDistance };
  };
  
  const findNearestOccForOdp = (odp: NodeType, occs: NodeType[]) => {
    let nearest = null;
    let minDistance = Infinity;
    for (const occ of occs) {
      if (occ.latitude && occ.longitude && odp.latitude && odp.longitude) {
        const distance = calculateDistance(occ.latitude, occ.longitude, odp.latitude, odp.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = occ;
        }
      }
    }
    return { nearest, distance: minDistance };
  };
  
  const findNearestOdpForHodp = (hodp: NodeType, odps: NodeType[]) => {
    let nearest = null;
    let minDistance = Infinity;
    for (const odp of odps) {
      if (odp.latitude && odp.longitude && hodp.latitude && hodp.longitude) {
        const distance = calculateDistance(odp.latitude, odp.longitude, hodp.latitude, hodp.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = odp;
        }
      }
    }
    return { nearest, distance: minDistance };
  };
  
  const runNearestAnalysis = async () => {
    setNearestLoading(true);
    try {
      const nodesRes = await fetch('/api/nodes');
      const allNodes = await nodesRes.json();
      const olts = allNodes.filter((n: NodeType) => n.node_category === 'OLT' && n.latitude && n.longitude);
      const occs = allNodes.filter((n: NodeType) => n.node_category === 'OCC' && n.latitude && n.longitude);
      const odps = allNodes.filter((n: NodeType) => n.node_category === 'ODP' && n.latitude && n.longitude);
      const hodps = allNodes.filter((n: NodeType) => n.node_category === 'HODP' && n.latitude && n.longitude);
      
      const occWithNearestOlt = occs.map((occ: NodeType) => {
        const { nearest, distance } = findNearestOltForOcc(occ, olts);
        return {
          occ_id: occ.node_id,
          occ_name: occ.name,
          nearest_olt_id: nearest?.node_id || 'N/A',
          nearest_olt_name: nearest?.name || 'N/A',
          distance_km: distance.toFixed(2)
        };
      });
      
      const odpWithNearestOcc = odps.map((odp: NodeType) => {
        const { nearest, distance } = findNearestOccForOdp(odp, occs);
        return {
          odp_id: odp.node_id,
          odp_name: odp.name,
          nearest_occ_id: nearest?.node_id || 'N/A',
          nearest_occ_name: nearest?.name || 'N/A',
          distance_km: distance.toFixed(2)
        };
      });
      
      const hodpWithNearestOdp = hodps.map((hodp: NodeType) => {
        const { nearest, distance } = findNearestOdpForHodp(hodp, odps);
        return {
          hodp_id: hodp.node_id,
          hodp_name: hodp.name,
          nearest_odp_id: nearest?.node_id || 'N/A',
          nearest_odp_name: nearest?.name || 'N/A',
          distance_km: distance.toFixed(2)
        };
      });
      
      setNearestResults({
        occs: occWithNearestOlt,
        odps: odpWithNearestOcc,
        hodps: hodpWithNearestOdp,
        summary: {
          total_olts: olts.length,
          total_occs: occs.length,
          total_odps: odps.length,
          total_hodps: hodps.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Nearest analysis error:', err);
      alert('Failed to run nearest analysis');
    } finally {
      setNearestLoading(false);
    }
  };
  
  const exportNearestResults = () => {
    if (!nearestResults) return;
    const allData = [
      ...nearestResults.occs.map((o: any) => ({ ...o, type: 'OCC→OLT' })),
      ...nearestResults.odps.map((o: any) => ({ ...o, type: 'ODP→OCC' })),
      ...nearestResults.hodps.map((o: any) => ({ ...o, type: 'HODP→ODP' }))
    ];
    const csv = convertToCSV(allData, [
      'type', 'occ_id', 'occ_name', 'nearest_olt_id', 'nearest_olt_name', 'distance_km'
    ]);
    downloadCSVContent(csv, `nearest_analysis_${new Date().toISOString().split('T')[0]}.csv`);
  };

  /* =========================
     💡 SUGGEST LINKS
  ========================= */
  
  const checkExistingLink = (fromId: string, toId: string): boolean => {
    return links.some(link => 
      (link.from_node?.node_id === fromId && link.to_node?.node_id === toId) ||
      (link.from_node?.node_id === toId && link.to_node?.node_id === fromId)
    );
  };
  
  const generateLinkSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestProgress(0);
    try {
      const nodesRes = await fetch('/api/nodes');
      const allNodes = await nodesRes.json();
      const linksRes = await fetch('/api/links');
      const existingLinks = await linksRes.json();
      setLinks(existingLinks);
      
      const olts = allNodes.filter((n: NodeType) => n.node_category === 'OLT');
      const occs = allNodes.filter((n: NodeType) => n.node_category === 'OCC');
      const odps = allNodes.filter((n: NodeType) => n.node_category === 'ODP');
      const hodps = allNodes.filter((n: NodeType) => n.node_category === 'HODP');
      
      const suggestions: SuggestedLink[] = [];
      
      setSuggestProgress(20);
      // STEP 1: OCC -> nearest OLT
      for (const occ of occs) {
        if (occ.latitude && occ.longitude) {
          let nearestOlt: NodeType | null = null;
          let minDistance = Infinity;
          for (const olt of olts) {
            if (olt.latitude && olt.longitude) {
              const dist = calculateDistance(olt.latitude, olt.longitude, occ.latitude, occ.longitude);
              if (dist < minDistance) { minDistance = dist; nearestOlt = olt; }
            }
          }
          if (nearestOlt && !checkExistingLink(nearestOlt.node_id, occ.node_id)) {
            suggestions.push({
              from_node: nearestOlt.node_id,
              from_node_id: nearestOlt._id,
              from_node_name: nearestOlt.name,
              to_node: occ.node_id,
              to_node_id: occ._id,
              to_node_name: occ.name,
              fiber_type: "SMF",
              fiber_core: 24,
              used_core: 0,
              length_km: minDistance,
              status: "planned",
              suggestion_type: "OLT to OCC (Primary)",
              priority: 1,
              reason: `Nearest OLT at ${minDistance.toFixed(2)}km`
            });
          }
        }
        setSuggestProgress(20 + (occs.indexOf(occ) / occs.length) * 30);
      }
      // STEP 2: ODP -> nearest OCC
      for (const odp of odps) {
        if (odp.latitude && odp.longitude) {
          let nearestOcc: NodeType | null = null;
          let minDistance = Infinity;
          for (const occ of occs) {
            if (occ.latitude && occ.longitude) {
              const dist = calculateDistance(occ.latitude, occ.longitude, odp.latitude, odp.longitude);
              if (dist < minDistance) { minDistance = dist; nearestOcc = occ; }
            }
          }
          if (nearestOcc && !checkExistingLink(nearestOcc.node_id, odp.node_id)) {
            suggestions.push({
              from_node: nearestOcc.node_id,
              from_node_id: nearestOcc._id,
              from_node_name: nearestOcc.name,
              to_node: odp.node_id,
              to_node_id: odp._id,
              to_node_name: odp.name,
              fiber_type: "SMF",
              fiber_core: 12,
              used_core: 0,
              length_km: minDistance,
              status: "planned",
              suggestion_type: "OCC to ODP (Distribution)",
              priority: 2,
              reason: `Nearest OCC at ${minDistance.toFixed(2)}km`
            });
          }
        }
        setSuggestProgress(50 + (odps.indexOf(odp) / odps.length) * 25);
      }
      // STEP 3: HODP -> nearest ODP
      for (const hodp of hodps) {
        if (hodp.latitude && hodp.longitude) {
          let nearestOdp: NodeType | null = null;
          let minDistance = Infinity;
          for (const odp of odps) {
            if (odp.latitude && odp.longitude) {
              const dist = calculateDistance(odp.latitude, odp.longitude, hodp.latitude, hodp.longitude);
              if (dist < minDistance) { minDistance = dist; nearestOdp = odp; }
            }
          }
          if (nearestOdp && !checkExistingLink(nearestOdp.node_id, hodp.node_id)) {
            suggestions.push({
              from_node: nearestOdp.node_id,
              from_node_id: nearestOdp._id,
              from_node_name: nearestOdp.name,
              to_node: hodp.node_id,
              to_node_id: hodp._id,
              to_node_name: hodp.name,
              fiber_type: "SMF",
              fiber_core: 6,
              used_core: 0,
              length_km: minDistance,
              status: "planned",
              suggestion_type: "ODP to HODP (Access)",
              priority: 3,
              reason: `Nearest ODP at ${minDistance.toFixed(2)}km`
            });
          }
        }
        setSuggestProgress(75 + (hodps.indexOf(hodp) / hodps.length) * 25);
      }
      
      suggestions.sort((a,b) => a.priority - b.priority || a.length_km - b.length_km);
      setSuggestedLinks(suggestions);
      setSuggestProgress(100);
      alert(`✅ Generated ${suggestions.length} suggestions\nOLT→OCC: ${suggestions.filter(s=>s.priority===1).length}\nOCC→ODP: ${suggestions.filter(s=>s.priority===2).length}\nODP→HODP: ${suggestions.filter(s=>s.priority===3).length}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate suggestions');
    } finally {
      setSuggestLoading(false);
      setTimeout(() => setSuggestProgress(0), 1000);
    }
  };
  
  const exportSuggestions = () => {
    if (suggestedLinks.length === 0) return;
    const exportData = suggestedLinks.map(s => ({
      from_node: s.from_node,
      to_node: s.to_node,
      fiber_type: s.fiber_type,
      fiber_core: s.fiber_core,
      used_core: s.used_core,
      length_km: s.length_km.toFixed(3),
      status: s.status,
      suggestion_type: s.suggestion_type,
      priority: s.priority,
      reason: s.reason
    }));
    const csv = convertToCSV(exportData, [
      'from_node','to_node','fiber_type','fiber_core','used_core','length_km','status','suggestion_type','priority','reason'
    ]);
    downloadCSVContent(csv, `link_suggestions_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const importSuggestions = async () => {
    if (suggestedLinks.length === 0) {
      alert('No suggestions to import.');
      return;
    }
    if (!confirm(`Import ${suggestedLinks.length} suggested links?`)) return;
    setImportLoading(true);
    setImportProgress(0);
    let imported = 0, failed = 0;
    for (let i = 0; i < suggestedLinks.length; i++) {
      const s = suggestedLinks[i];
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_node: s.from_node_id,
            to_node: s.to_node_id,
            fiber_type: s.fiber_type,
            fiber_core: s.fiber_core,
            used_core: s.used_core,
            length: s.length_km * 1000,
            status: s.status
          })
        });
        if (res.ok) imported++; else failed++;
      } catch (err) { failed++; }
      setImportProgress(Math.round(((i+1)/suggestedLinks.length)*100));
    }
    alert(`✅ Imported: ${imported}, Failed: ${failed}`);
    fetchLinks();
    setImportLoading(false);
    setTimeout(() => setImportProgress(0), 1000);
  };

  /* =========================
     👀 PREVIEW & IMPORT
  ========================= */
  const handlePreview = async () => {
    if (!file) return alert("Select CSV file");
    setImportLoading(true);
    setImportProgress(30);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");
      const res = await fetch("/api/import-links", { method: "POST", body: formData });
      const data = await res.json();
      setPreview(data?.preview || []);
      setSummary(data?.summary || null);
      setImportProgress(100);
    } catch (err) {
      console.error(err);
      alert("Preview failed");
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  const handleImport = async () => {
    if (!file) return alert("Select file");
    setImportLoading(true);
    setImportProgress(50);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");
      const res = await fetch("/api/import-links", { method: "POST", body: formData });
      const data = await res.json();
      setImportProgress(100);
      alert(`✅ Inserted: ${data?.summary?.inserted ?? 0}, Updated: ${data?.summary?.updates ?? 0}`);
      setFile(null);
      setPreview([]);
      setSummary(null);
      fetchLinks();
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error(err);
      alert("Import failed");
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  const handleDeleteLink = async () => {
    if (!selectedLink) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/links?id=${selectedLink._id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ Link deleted');
        fetchLinks();
        setDeleteDialogOpen(false);
        setSelectedLink(null);
      } else alert('❌ Delete failed');
    } catch (err) {
      console.error(err);
      alert('Delete error');
    } finally {
      setDeleting(false);
    }
  };

  const formatLength = (value: any) => {
    const num = Number(value);
    return !isNaN(num) && num > 0 ? (num / 1000).toFixed(2) : "-";
  };

  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString() : '-';

  /* =========================
     🎨 UI
  ========================= */
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">🔗 Link Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage fiber connections | Import | Export | Smart Suggestions | Nearest Node
        </p>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="table">📋 Link Table</TabsTrigger>
          <TabsTrigger value="import">📥 Import Links</TabsTrigger>
          <TabsTrigger value="export">📤 Export Data</TabsTrigger>
          <TabsTrigger value="suggest">💡 Suggest Links</TabsTrigger>
          <TabsTrigger value="nearest">📍 Nearest Node</TabsTrigger>
        </TabsList>

        {/* TAB 1: LINK TABLE */}
        <TabsContent value="table" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Fiber Links</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchLinks}>🔄 Refresh</Button>
              </div>
              <p className="text-sm text-muted-foreground">Total: {links.length} connections</p>
            </CardHeader>
            <CardContent>
              {loadingLinks ? (
                <div className="text-center py-8">Loading links...</div>
              ) : links.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No links. Use "Suggest Links" to generate.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From Node</TableHead>
                        <TableHead>To Node</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Fiber Core</TableHead>
                        <TableHead>Used Core</TableHead>
                        <TableHead>Length (km)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((link) => (
                        <TableRow key={link._id}>
                          <TableCell className="font-mono text-xs">
                            {link.from_node?.node_id || 'N/A'}
                            <div className="text-xs text-muted-foreground">{link.from_node?.node_category}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {link.to_node?.node_id || 'N/A'}
                            <div className="text-xs text-muted-foreground">{link.to_node?.node_category}</div>
                          </TableCell>
                          <TableCell>{link.fiber_type ? <Badge variant="outline">{link.fiber_type}</Badge> : '-'}</TableCell>
                          <TableCell>{link.fiber_core ?? '-'}</TableCell>
                          <TableCell>{link.used_core ?? '-'}</TableCell>
                          <TableCell>{link.length ? formatLength(link.length) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={link.status === 'active' ? 'default' : 'secondary'}>
                              {link.status || 'planned'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(link.createdAt || '')}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                              onClick={() => { setSelectedLink(link); setDeleteDialogOpen(true); }}>
                              🗑️ Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: IMPORT LINKS */}
        <TabsContent value="import" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>📥 Import Links from CSV</CardTitle>
              <p className="text-sm text-muted-foreground">
                Required columns: <code>from_node, to_node, fiber_type, fiber_core, used_core, length_km, status</code>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={importLoading || !file}>👀 Preview</Button>
                <Button onClick={handleImport} disabled={importLoading || !file}>✅ Import</Button>
              </div>
              {importLoading && importProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">Processing... {importProgress}%</p>
                </div>
              )}
              {summary && (
                <Alert>
                  <AlertDescription>
                    <div className="flex gap-4 text-sm">
                      <span>Total: <b>{summary.total}</b></span>
                      <span className="text-green-600">Valid: <b>{summary.valid}</b></span>
                      <span className="text-yellow-500">Updates: <b>{summary.updates ?? 0}</b></span>
                      <span className="text-red-600">Invalid: <b>{summary.invalid}</b></span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {preview.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Type</TableHead>
                        <TableHead>Core</TableHead><TableHead>Used</TableHead><TableHead>Length (km)</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 50).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.from_node}</TableCell>
                          <TableCell>{row.to_node}</TableCell>
                          <TableCell>{row.fiber_type ? <Badge variant="outline">{row.fiber_type}</Badge> : '-'}</TableCell>
                          <TableCell>{row.fiber_core ?? '-'}</TableCell>
                          <TableCell>{row.used_core ?? '-'}</TableCell>
                          <TableCell>{formatLength(row.length)}</TableCell>
                          <TableCell>
                            {row.status_check === "ok" && <Badge className="bg-green-600">New</Badge>}
                            {row.status_check === "update" && <Badge className="bg-yellow-500">Update</Badge>}
                            {row.status_check === "error" && <Badge variant="destructive">{row.error}</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {preview.length > 50 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 50 of {preview.length}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: EXPORT DATA */}
        <TabsContent value="export" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>📤 Export Network Data</CardTitle>
              <p className="text-sm text-muted-foreground">Download CSV files for reporting or re-import</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button disabled={exportLoading === "import-template"} onClick={exportImportTemplate} variant="default" className="h-20 flex flex-col gap-1">
                  <span className="text-lg">📋</span>
                  <span>Import Template</span>
                  <span className="text-xs">Headers + example data</span>
                </Button>
                <Button disabled={exportLoading === "all-links"} onClick={exportAllLinks} variant="default" className="h-20 flex flex-col gap-1">
                  <span className="text-lg">🌐</span>
                  <span>All Links Export</span>
                  <span className="text-xs">Complete network</span>
                </Button>
                <Button disabled={exportLoading === "links"} onClick={() => downloadCSV("/api/export-links", "links.csv", "links")} variant="secondary" className="h-20 flex flex-col gap-1">
                  <span className="text-lg">⬇️</span>
                  <span>Current Links</span>
                  <span className="text-xs">Raw links data</span>
                </Button>
                <Button disabled={exportLoading === "suggestions"} onClick={() => downloadCSV("/api/network/suggestions?download=1", "suggested_links.csv", "suggestions")} variant="outline" className="h-20 flex flex-col gap-1">
                  <span className="text-lg">⚡</span>
                  <span>Suggested Links</span>
                  <span className="text-xs">AI recommendations</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SUGGEST LINKS */}
        <TabsContent value="suggest" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>💡 Smart Link Suggestions</CardTitle>
              <p className="text-sm text-muted-foreground">OLT → OCC → ODP → HODP hierarchy</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={generateLinkSuggestions} disabled={suggestLoading} className="bg-green-600 hover:bg-green-700">
                  {suggestLoading ? "Generating..." : "🔍 Generate Suggestions"}
                </Button>
                {suggestedLinks.length > 0 && (
                  <>
                    <Button variant="outline" onClick={exportSuggestions}>📥 Export Suggestions</Button>
                    <Button variant="default" onClick={importSuggestions} disabled={importLoading}>🚀 Import All</Button>
                  </>
                )}
              </div>
              {suggestLoading && suggestProgress > 0 && (
                <div className="space-y-2"><Progress value={suggestProgress} /><p className="text-xs text-center">Generating... {suggestProgress}%</p></div>
              )}
              {suggestedLinks.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{suggestedLinks.filter(s=>s.priority===1).length}</div><p className="text-xs">OLT → OCC</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{suggestedLinks.filter(s=>s.priority===2).length}</div><p className="text-xs">OCC → ODP</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{suggestedLinks.filter(s=>s.priority===3).length}</div><p className="text-xs">ODP → HODP</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-orange-600">{suggestedLinks.length}</div><p className="text-xs">Total</p></CardContent></Card>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Type</TableHead><TableHead>Length (km)</TableHead><TableHead>Suggestion Type</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {suggestedLinks.map((s,idx)=>(
                          <TableRow key={idx}>
                            <TableCell><Badge variant={s.priority===1?"destructive":s.priority===2?"default":"secondary"}>{s.priority===1?"HIGH":s.priority===2?"MEDIUM":"LOW"}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{s.from_node}<div className="text-xs text-muted-foreground">{s.from_node_name}</div></TableCell>
                            <TableCell className="font-mono text-xs">{s.to_node}<div className="text-xs text-muted-foreground">{s.to_node_name}</div></TableCell>
                            <TableCell>{s.fiber_type}</TableCell>
                            <TableCell>{s.length_km.toFixed(2)} km</TableCell>
                            <TableCell><Badge variant="outline">{s.suggestion_type}</Badge></TableCell>
                            <TableCell className="text-xs">{s.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: NEAREST NODE */}
        <TabsContent value="nearest" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>📍 Nearest Node Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">OLT → OCC → ODP → HODP geographical parenting</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runNearestAnalysis} disabled={nearestLoading}>{nearestLoading ? "Analyzing..." : "🔍 Run Analysis"}</Button>
              {nearestLoading && <Progress value={100} className="animate-pulse" />}
              {nearestResults && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{nearestResults.summary.total_olts}</div><p className="text-xs">OLTs</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{nearestResults.summary.total_occs}</div><p className="text-xs">OCCs</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{nearestResults.summary.total_odps}</div><p className="text-xs">ODPs</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-orange-600">{nearestResults.summary.total_hodps}</div><p className="text-xs">HODPs</p></CardContent></Card>
                  </div>
                  <div className="flex justify-between"><h3 className="font-semibold">Results</h3><Button variant="outline" size="sm" onClick={exportNearestResults}>📥 Export</Button></div>
                  {nearestResults.occs.length>0&&(<div><h4 className="font-medium mb-2">1. OCC → Nearest OLT</h4><Table><TableHeader><TableRow><TableHead>OCC</TableHead><TableHead>Nearest OLT</TableHead><TableHead>Distance (km)</TableHead></TableRow></TableHeader><TableBody>{nearestResults.occs.slice(0,10).map((occ:any,i:number)=>(<TableRow key={i}><TableCell className="font-mono text-xs">{occ.occ_id}</TableCell><TableCell className="font-mono text-xs">{occ.nearest_olt_id}</TableCell><TableCell>{occ.distance_km} km</TableCell></TableRow>))}</TableBody></Table></div>)}
                  {nearestResults.odps.length>0&&(<div><h4 className="font-medium mb-2">2. ODP → Nearest OCC</h4><Table><TableHeader><TableRow><TableHead>ODP</TableHead><TableHead>Nearest OCC</TableHead><TableHead>Distance (km)</TableHead></TableRow></TableHeader><TableBody>{nearestResults.odps.slice(0,10).map((odp:any,i:number)=>(<TableRow key={i}><TableCell className="font-mono text-xs">{odp.odp_id}</TableCell><TableCell className="font-mono text-xs">{odp.nearest_occ_id}</TableCell><TableCell>{odp.distance_km} km</TableCell></TableRow>))}</TableBody></Table></div>)}
                  {nearestResults.hodps.length>0&&(<div><h4 className="font-medium mb-2">3. HODP → Nearest ODP</h4><Table><TableHeader><TableRow><TableHead>HODP</TableHead><TableHead>Nearest ODP</TableHead><TableHead>Distance (km)</TableHead></TableRow></TableHeader><TableBody>{nearestResults.hodps.slice(0,10).map((hodp:any,i:number)=>(<TableRow key={i}><TableCell className="font-mono text-xs">{hodp.hodp_id}</TableCell><TableCell className="font-mono text-xs">{hodp.nearest_odp_id}</TableCell><TableCell>{hodp.distance_km} km</TableCell></TableRow>))}</TableBody></Table></div>)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Delete link between <strong>{selectedLink?.from_node?.node_id}</strong> and <strong>{selectedLink?.to_node?.node_id}</strong>? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={()=>setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteLink} disabled={deleting}>{deleting?"Deleting...":"Yes, Delete"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}