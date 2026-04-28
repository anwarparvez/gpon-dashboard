"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ✅ shadcn */
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";

/* =========================
   🔒 TYPES
========================= */

type NodeCategory = "OLT" | "OCC" | "ODP" | "HODP" | "Branch Point";

type NodeStatus = "existing" | "proposed";

type NodeType = {
  _id: string;
  node_id: string;
  name: string;
  node_category: NodeCategory;
  status: NodeStatus;
  latitude?: number;
  longitude?: number;
  region?: string;
  dgm?: string;
  address?: string;
};

type LinkType = {
  _id: string;
  from_node: any;
  to_node: any;
  fiber_length?: number;
  cable_type?: string;
};

type CategoryStat = {
  existing: number;
  proposed: number;
  total: number;
};

type OccSummaryType = {
  odp: Set<string>;
  hodp: Set<string>;
  branch: number;
  total: number;
};

type LinkSummaryType = {
  occToOdpLength: number;
  odpToHodpLength: number;
  totalLength: number;
  odpCount: number;
  hodpCount: number;
  avgOdpDistance: number;
  avgHodpDistance: number;
};

/* =========================
   📏 Distance Calculation
========================= */

function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   🏠 PAGE
========================= */

export default function Home() {
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [filter, setFilter] = useState<"all" | "existing" | "proposed">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOcc, setSelectedOcc] = useState<string>("");
  const [selectedOdp, setSelectedOdp] = useState<string>("");
  const [selectedOlt, setSelectedOlt] = useState<string>("");
  const [hodpsToDelete, setHodpsToDelete] = useState<NodeType[]>([]);
  const [selectedHodps, setSelectedHodps] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"occ" | "olt">("occ");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [nodesRes, linksRes] = await Promise.all([
          fetch("/api/nodes"),
          fetch("/api/links"),
        ]);

        if (!nodesRes.ok) throw new Error("Failed to fetch nodes");
        if (!linksRes.ok) throw new Error("Failed to fetch links");

        const nodesData = await nodesRes.json();
        const linksData = await linksRes.json();

        setNodes(nodesData);
        setLinks(linksData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* =========================
     📊 SUMMARY
  ========================= */

  const totalNodes = nodes.length;
  const totalLinks = links.length;
  const existingNodes = nodes.filter((n) => n.status === "existing").length;
  const proposedNodes = nodes.filter((n) => n.status === "proposed").length;

  /* =========================
     📊 CATEGORY STATS
  ========================= */

  const categoryStats: Record<NodeCategory, CategoryStat> = {
    OLT: { existing: 0, proposed: 0, total: 0 },
    OCC: { existing: 0, proposed: 0, total: 0 },
    ODP: { existing: 0, proposed: 0, total: 0 },
    HODP: { existing: 0, proposed: 0, total: 0 },
    "Branch Point": { existing: 0, proposed: 0, total: 0 },
  };

  nodes.forEach((node) => {
    if (categoryStats[node.node_category]) {
      categoryStats[node.node_category].total++;
      if (node.status === "existing") {
        categoryStats[node.node_category].existing++;
      } else {
        categoryStats[node.node_category].proposed++;
      }
    }
  });

  /* =========================
     🔗 OCC SUMMARY (FIXED - HODPs are Sets)
  ========================= */

  const nodeMap = new Map(nodes.map((n) => [n._id, n]));
  const odpToOcc: Record<string, string> = {};

  // Step 1: Map ODPs to their parent OCC
  links.forEach((link) => {
    const from = nodeMap.get(link.from_node?._id || link.from_node);
    const to = nodeMap.get(link.to_node?._id || link.to_node);
    if (!from || !to) return;

    // OCC → ODP connection
    if (from.node_category === "OCC" && to.node_category === "ODP") {
      odpToOcc[to.node_id] = from.node_id;
    }
    // ODP → OCC connection (reverse direction)
    if (to.node_category === "OCC" && from.node_category === "ODP") {
      odpToOcc[from.node_id] = to.node_id;
    }
  });

  // Step 2: Build OCC summary with unique ODPs and HODPs
  const occSummary: Record<string, OccSummaryType> = {};

  links.forEach((link) => {
    const from = nodeMap.get(link.from_node?._id || link.from_node);
    const to = nodeMap.get(link.to_node?._id || link.to_node);
    if (!from || !to) return;

    // Find ODP in the connection
    let odp: any = null;
    let other: any = null;

    if (from.node_category === "ODP") {
      odp = from;
      other = to;
    } else if (to.node_category === "ODP") {
      odp = to;
      other = from;
    }

    if (!odp || !other) return;

    // Find which OCC this ODP belongs to
    const occ = odpToOcc[odp.node_id];
    if (!occ) return;

    // Initialize OCC entry if not exists
    if (!occSummary[occ]) {
      occSummary[occ] = {
        odp: new Set(),
        hodp: new Set(),
        branch: 0,
        total: 0,
      };
    }

    // Add ODP to the Set (automatically handles duplicates)
    occSummary[occ].odp.add(odp.node_id);

    // Increment total connections
    occSummary[occ].total++;

    // Count downstream nodes
    if (other.node_category === "HODP") {
      occSummary[occ].hodp.add(other.node_id);
    } else if (other.node_category === "Branch Point") {
      occSummary[occ].branch++;
    }
  });

  // Convert to array for display
  const occSummaryArray = Object.entries(occSummary).map(([occ, data]) => ({
    occId: occ,
    odpCount: data.odp.size,
    hodpCount: data.hodp.size,
    branchCount: data.branch,
    totalConnections: data.total,
  }));

  occSummaryArray.sort((a, b) => a.occId.localeCompare(b.occId));

 /* =========================
   📊 LINK SUMMARY TABLE (FIXED)
   Properly calculate OCC→ODP and ODP→HODP lengths
========================= */

const nodeIdMap = new Map(nodes.map((n) => [n.node_id, n]));
const linkSummary: Record<string, LinkSummaryType> = {};
const odpToOccMap: Record<string, string> = {};

// Step 1: First, map all ODPs to their parent OCC
links.forEach((link) => {
  const from = nodeMap.get(link.from_node?._id || link.from_node);
  const to = nodeMap.get(link.to_node?._id || link.to_node);
  if (!from || !to) return;

  // OCC → ODP connection (store the parent OCC for this ODP)
  if (from.node_category === "OCC" && to.node_category === "ODP") {
    odpToOccMap[to.node_id] = from.node_id;
  }
  // ODP → OCC connection (reverse direction)
  if (to.node_category === "OCC" && from.node_category === "ODP") {
    odpToOccMap[from.node_id] = to.node_id;
  }
});

// Step 2: Calculate OCC → ODP lengths
links.forEach((link) => {
  const from = nodeMap.get(link.from_node?._id || link.from_node);
  const to = nodeMap.get(link.to_node?._id || link.to_node);
  if (!from || !to) return;

  // OCC → ODP
  if (from.node_category === "OCC" && to.node_category === "ODP") {
    let length = link.fiber_length || 0;
    if (length === 0 && from.latitude && from.longitude && to.latitude && to.longitude) {
      length = getDistance(from.latitude, from.longitude, to.latitude, to.longitude);
    }

    if (!linkSummary[from.node_id]) {
      linkSummary[from.node_id] = {
        occToOdpLength: 0,
        odpToHodpLength: 0,
        totalLength: 0,
        odpCount: 0,
        hodpCount: 0,
        avgOdpDistance: 0,
        avgHodpDistance: 0,
      };
    }

    linkSummary[from.node_id].occToOdpLength += length;
    linkSummary[from.node_id].odpCount++;
  }
  
  // ODP → OCC (reverse direction - ODP connected to OCC)
  if (from.node_category === "ODP" && to.node_category === "OCC") {
    let length = link.fiber_length || 0;
    if (length === 0 && from.latitude && from.longitude && to.latitude && to.longitude) {
      length = getDistance(from.latitude, from.longitude, to.latitude, to.longitude);
    }

    if (!linkSummary[to.node_id]) {
      linkSummary[to.node_id] = {
        occToOdpLength: 0,
        odpToHodpLength: 0,
        totalLength: 0,
        odpCount: 0,
        hodpCount: 0,
        avgOdpDistance: 0,
        avgHodpDistance: 0,
      };
    }

    linkSummary[to.node_id].occToOdpLength += length;
    linkSummary[to.node_id].odpCount++;
  }
});

// Step 3: Calculate ODP → HODP lengths and map to parent OCC
links.forEach((link) => {
  const from = nodeMap.get(link.from_node?._id || link.from_node);
  const to = nodeMap.get(link.to_node?._id || link.to_node);
  if (!from || !to) return;

  // ODP → HODP
  if (from.node_category === "ODP" && to.node_category === "HODP") {
    const parentOcc = odpToOccMap[from.node_id];
    if (parentOcc && linkSummary[parentOcc]) {
      let length = link.fiber_length || 0;
      if (length === 0 && from.latitude && from.longitude && to.latitude && to.longitude) {
        length = getDistance(from.latitude, from.longitude, to.latitude, to.longitude);
      }
      linkSummary[parentOcc].odpToHodpLength += length;
      linkSummary[parentOcc].hodpCount++;
    }
  }
  
  // HODP → ODP (reverse direction)
  if (from.node_category === "HODP" && to.node_category === "ODP") {
    const parentOcc = odpToOccMap[to.node_id];
    if (parentOcc && linkSummary[parentOcc]) {
      let length = link.fiber_length || 0;
      if (length === 0 && from.latitude && from.longitude && to.latitude && to.longitude) {
        length = getDistance(from.latitude, from.longitude, to.latitude, to.longitude);
      }
      linkSummary[parentOcc].odpToHodpLength += length;
      linkSummary[parentOcc].hodpCount++;
    }
  }
});

// Step 4: Calculate totals and averages
Object.keys(linkSummary).forEach((occ) => {
  const summary = linkSummary[occ];
  summary.totalLength = summary.occToOdpLength + summary.odpToHodpLength;
  summary.avgOdpDistance = summary.odpCount > 0 ? summary.occToOdpLength / summary.odpCount : 0;
  summary.avgHodpDistance = summary.hodpCount > 0 ? summary.odpToHodpLength / summary.hodpCount : 0;
});

// Step 5: Convert to array for display
const linkSummaryArray = Object.entries(linkSummary)
  .map(([occId, data]) => {
    const occNode = nodeIdMap.get(occId);
    const occName = occNode?.name || occId;
    return {
      occId,
      occName,
      occToOdpLength: data.occToOdpLength,
      odpToHodpLength: data.odpToHodpLength,
      totalLength: data.totalLength,
      odpCount: data.odpCount,
      hodpCount: data.hodpCount,
      avgOdpDistance: data.avgOdpDistance,
      avgHodpDistance: data.avgHodpDistance,
    };
  })
  .sort((a, b) => b.totalLength - a.totalLength);
  /* =========================
     🚫 UNCONNECTED
  ========================= */

  const connectedSet = new Set<string>();
  links.forEach((link) => {
    connectedSet.add(String(link.from_node?._id || link.from_node));
    connectedSet.add(String(link.to_node?._id || link.to_node));
  });

  const unconnectedNodes = nodes.filter(
    (n) => !connectedSet.has(String(n._id)),
  );
  const filteredUnconnectedNodes = unconnectedNodes.filter((n) => {
    if (filter === "all") return true;
    return n.status === filter;
  });

  /* =========================
     📊 REGION STATS
  ========================= */

  const regionStats: Record<string, { existing: number; proposed: number }> =
    {};
  nodes.forEach((node) => {
    const region = node.region || "Unknown";
    if (!regionStats[region])
      regionStats[region] = { existing: 0, proposed: 0 };
    if (node.status === "existing") {
      regionStats[region].existing++;
    } else {
      regionStats[region].proposed++;
    }
  });

  /* =========================
     🗑️ DELETE HODPS BY OCC/ODP/OLT
  ========================= */

  // Get all OLTs
  const olts = nodes.filter((n) => n.node_category === "OLT");

  // Get all OCCs
  const occs = nodes.filter((n) => n.node_category === "OCC");

  // Get ODPs for selected OCC
  const getOdpsForOcc = (occId: string) => {
    return nodes.filter(
      (n) => n.node_category === "ODP" && odpToOccMap[n.node_id] === occId,
    );
  };

  // Get OCCs under an OLT (based on network hierarchy)
  const getOccsUnderOlt = (oltId: string) => {
    // This requires proper hierarchy mapping
    // For now, return all OCCs (you can implement proper mapping based on your network structure)
    return occs;
  };

  // Get HODPs under a specific ODP
  const getHodpsUnderOdp = (odpId: string) => {
    const hodpIds = new Set<string>();
    links.forEach((link) => {
      const from = nodeMap.get(link.from_node?._id || link.from_node);
      const to = nodeMap.get(link.to_node?._id || link.to_node);
      if (!from || !to) return;

      if (
        from.node_category === "ODP" &&
        from.node_id === odpId &&
        to.node_category === "HODP"
      ) {
        hodpIds.add(to.node_id);
      }
      if (
        to.node_category === "ODP" &&
        to.node_id === odpId &&
        from.node_category === "HODP"
      ) {
        hodpIds.add(from.node_id);
      }
    });

    return nodes.filter((n) => hodpIds.has(n.node_id));
  };

  // Get all HODPs under selected OCC
  const getHodpsUnderOcc = (occId: string) => {
    const odpIds = getOdpsForOcc(occId).map((odp) => odp.node_id);
    const hodpIds = new Set<string>();

    links.forEach((link) => {
      const from = nodeMap.get(link.from_node?._id || link.from_node);
      const to = nodeMap.get(link.to_node?._id || link.to_node);
      if (!from || !to) return;

      if (
        from.node_category === "ODP" &&
        odpIds.includes(from.node_id) &&
        to.node_category === "HODP"
      ) {
        hodpIds.add(to.node_id);
      }
      if (
        to.node_category === "ODP" &&
        odpIds.includes(to.node_id) &&
        from.node_category === "HODP"
      ) {
        hodpIds.add(from.node_id);
      }
    });

    return nodes.filter((n) => hodpIds.has(n.node_id));
  };

  // Get all HODPs under selected OLT
  const getHodpsUnderOlt = (oltId: string) => {
    // This traverses OLT -> OCC -> ODP -> HODP
    const occsUnderOlt = getOccsUnderOlt(oltId);
    const odpIds = new Set<string>();
    const hodpIds = new Set<string>();

    occsUnderOlt.forEach((occ) => {
      const odps = getOdpsForOcc(occ.node_id);
      odps.forEach((odp) => odpIds.add(odp.node_id));
    });

    links.forEach((link) => {
      const from = nodeMap.get(link.from_node?._id || link.from_node);
      const to = nodeMap.get(link.to_node?._id || link.to_node);
      if (!from || !to) return;

      if (
        from.node_category === "ODP" &&
        odpIds.has(from.node_id) &&
        to.node_category === "HODP"
      ) {
        hodpIds.add(to.node_id);
      }
      if (
        to.node_category === "ODP" &&
        odpIds.has(to.node_id) &&
        from.node_category === "HODP"
      ) {
        hodpIds.add(from.node_id);
      }
    });

    return nodes.filter((n) => hodpIds.has(n.node_id));
  };

  const loadHodpsToDelete = () => {
    let hodps: NodeType[] = [];

    if (deleteMode === "olt" && selectedOlt) {
      hodps = getHodpsUnderOlt(selectedOlt);
    } else if (deleteMode === "occ") {
      if (selectedOcc && selectedOdp && selectedOdp !== "all") {
        hodps = getHodpsUnderOdp(selectedOdp);
      } else if (selectedOcc) {
        hodps = getHodpsUnderOcc(selectedOcc);
      }
    }

    setHodpsToDelete(hodps);
    setSelectedHodps(new Set(hodps.map((h) => h._id)));
  };

  const toggleSelectAll = () => {
    if (selectedHodps.size === hodpsToDelete.length) {
      setSelectedHodps(new Set());
    } else {
      setSelectedHodps(new Set(hodpsToDelete.map((h) => h._id)));
    }
  };

  const toggleSelectHodp = (id: string) => {
    const newSelected = new Set(selectedHodps);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHodps(newSelected);
  };

  const handleBulkDelete = async () => {
    const hodpsToActuallyDelete = hodpsToDelete.filter((h) =>
      selectedHodps.has(h._id),
    );

    if (hodpsToActuallyDelete.length === 0) {
      alert("Please select at least one HODP to delete");
      return;
    }

    setDeleting(true);

    try {
      // Collect all IDs for bulk deletion
      const nodeIds = hodpsToActuallyDelete.map((h) => h._id);
      const linkIds: string[] = [];

      // Find all links connected to these HODPs
      hodpsToActuallyDelete.forEach((hodp) => {
        const relatedLinks = links.filter((link) => {
          const fromId = link.from_node?._id || link.from_node;
          const toId = link.to_node?._id || link.to_node;
          return fromId === hodp._id || toId === hodp._id;
        });
        relatedLinks.forEach((link) => linkIds.push(link._id));
      });

      // Call bulk delete API
      const response = await fetch("/api/nodes/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeIds, linkIds: [...new Set(linkIds)] }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `✅ Successfully deleted ${result.results?.deletedNodes || hodpsToActuallyDelete.length} HODP(s) and ${result.results?.deletedLinks || linkIds.length} links`,
        );

        // Refresh data
        const [nodesRes, linksRes] = await Promise.all([
          fetch("/api/nodes"),
          fetch("/api/links"),
        ]);

        if (nodesRes.ok) setNodes(await nodesRes.json());
        if (linksRes.ok) setLinks(await linksRes.json());

        setDeleteDialogOpen(false);
        setSelectedOcc("");
        setSelectedOdp("");
        setSelectedOlt("");
        setHodpsToDelete([]);
        setSelectedHodps(new Set());
      } else {
        alert(`❌ Bulk delete failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Failed to delete HODPs");
    } finally {
      setDeleting(false);
    }
  };

  /* =========================
     🎨 UI
  ========================= */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">
          GPON Planning Dashboard
        </h1>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Error loading dashboard: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">GPON Planning Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fiber-lengths">Fiber Lengths</TabsTrigger>
          <TabsTrigger value="occ-details">OCC Details</TabsTrigger>
          <TabsTrigger value="delete-hodp">🗑️ Delete HODPs</TabsTrigger>
          <TabsTrigger value="unconnected">Unconnected</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Nodes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalNodes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((existingNodes / totalNodes) * 100) || 0}%
                  Existing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalLinks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unconnected Nodes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">
                  {unconnectedNodes.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((unconnectedNodes.length / totalNodes) * 100) ||
                    0}
                  % of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Network Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {Math.round(
                    ((totalNodes - unconnectedNodes.length) / totalNodes) * 100,
                  ) || 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Connected nodes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Existing vs Proposed */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Existing Network
                  <Badge variant="default" className="bg-green-600">
                    LIVE
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {existingNodes}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${(existingNodes / totalNodes) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((existingNodes / totalNodes) * 100)}% of total
                  nodes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Proposed Network
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-500"
                  >
                    PLANNED
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-500">
                  {proposedNodes}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${(proposedNodes / totalNodes) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((proposedNodes / totalNodes) * 100)}% of total
                  nodes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Table */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Category-wise Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Existing</TableHead>
                    <TableHead className="text-center">Proposed</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">% of Network</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Object.keys(categoryStats) as NodeCategory[]).map((cat) => (
                    <TableRow key={cat}>
                      <TableCell className="font-medium">{cat}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {categoryStats[cat].existing}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {categoryStats[cat].proposed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {categoryStats[cat].total}
                      </TableCell>
                      <TableCell className="text-center">
                        {Math.round(
                          (categoryStats[cat].total / totalNodes) * 100,
                        ) || 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Region Stats */}
          {Object.keys(regionStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📍 Regional Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-center">Existing</TableHead>
                      <TableHead className="text-center">Proposed</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(regionStats)
                      .sort(
                        (a, b) =>
                          b[1].existing +
                          b[1].proposed -
                          (a[1].existing + a[1].proposed),
                      )
                      .map(([region, stats]) => (
                        <TableRow key={region}>
                          <TableCell className="font-medium">
                            {region}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{stats.existing}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{stats.proposed}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {stats.existing + stats.proposed}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fiber-lengths" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>🔗 Fiber Length Summary by OCC</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total fiber lengths for OCC→ODP and ODP→HODP connections (in
                meters)
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OCC Node</TableHead>
                      <TableHead className="text-center">ODPs</TableHead>
                      <TableHead className="text-center">HODPs</TableHead>
                      <TableHead className="text-center">OCC→ODP (m)</TableHead>
                      <TableHead className="text-center">
                        ODP→HODP (m)
                      </TableHead>
                      <TableHead className="text-center">
                        Total Fiber (m)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkSummaryArray.map((item) => (
                      <TableRow key={item.occId}>
                        <TableCell className="font-mono text-xs font-bold">
                          {item.occName}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.odpCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.hodpCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {Math.round(item.occToOdpLength).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {Math.round(item.odpToHodpLength).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-blue-600">
                          {Math.round(item.totalLength).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Fiber Length
                    </p>
                    <p className="text-lg font-bold">
                      {Math.round(
                        linkSummaryArray.reduce(
                          (sum, item) => sum + item.totalLength,
                          0,
                        ),
                      ).toLocaleString()}{" "}
                      m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total OCC→ODP Fiber
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {Math.round(
                        linkSummaryArray.reduce(
                          (sum, item) => sum + item.occToOdpLength,
                          0,
                        ),
                      ).toLocaleString()}{" "}
                      m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total ODP→HODP Fiber
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {Math.round(
                        linkSummaryArray.reduce(
                          (sum, item) => sum + item.odpToHodpLength,
                          0,
                        ),
                      ).toLocaleString()}{" "}
                      m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total OCCs</p>
                    <p className="text-lg font-bold">
                      {linkSummaryArray.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occ-details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 OCC Details Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Each OCC with its connected ODPs and HODPs (HODPs are connected via ODPs)
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OCC Node ID</TableHead>
                    <TableHead className="text-center">Connected ODPs</TableHead>
                    <TableHead className="text-center">Connected HODPs</TableHead>
                    <TableHead className="text-center">Branch Points</TableHead>
                    <TableHead className="text-center">Total Connections</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occSummaryArray.map((item) => (
                    <TableRow key={item.occId}>
                      <TableCell className="font-bold font-mono text-xs">
                        {item.occId}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-blue-500">
                          {item.odpCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {item.hodpCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {item.branchCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {item.totalConnections}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete-hodp" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>🗑️ Delete HODPs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select HODPs by OLT, OCC, or ODP to bulk delete. Use checkboxes
                to select specific HODPs.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delete Mode Selection */}
              <div className="flex gap-4">
                <Button
                  variant={deleteMode === "occ" ? "default" : "outline"}
                  onClick={() => {
                    setDeleteMode("occ");
                    setSelectedOlt("");
                    setSelectedOcc("");
                    setSelectedOdp("");
                  }}
                >
                  By OCC/ODP
                </Button>
                <Button
                  variant={deleteMode === "olt" ? "default" : "outline"}
                  onClick={() => {
                    setDeleteMode("olt");
                    setSelectedOcc("");
                    setSelectedOdp("");
                  }}
                >
                  By OLT
                </Button>
              </div>

              {/* OLT Selection */}
              {deleteMode === "olt" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select OLT
                  </label>
                  <Select value={selectedOlt} onValueChange={setSelectedOlt}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an OLT" />
                    </SelectTrigger>
                    <SelectContent>
                      {olts.map((olt) => (
                        <SelectItem key={olt._id} value={olt.node_id}>
                          {olt.node_id} - {olt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* OCC/ODP Selection */}
              {deleteMode === "occ" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select OCC
                    </label>
                    <Select
                      value={selectedOcc}
                      onValueChange={(value) => {
                        setSelectedOcc(value);
                        setSelectedOdp("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an OCC" />
                      </SelectTrigger>
                      <SelectContent>
                        {occs.map((occ) => (
                          <SelectItem key={occ._id} value={occ.node_id}>
                            {occ.node_id} - {occ.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select ODP (Optional)
                    </label>
                    <Select
                      value={selectedOdp}
                      onValueChange={setSelectedOdp}
                      disabled={!selectedOcc}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedOcc ? "Choose an ODP" : "Select OCC first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All ODPs under {selectedOcc}
                        </SelectItem>
                        {getOdpsForOcc(selectedOcc).map((odp) => (
                          <SelectItem key={odp._id} value={odp.node_id}>
                            {odp.node_id} - {odp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                onClick={loadHodpsToDelete}
                disabled={
                  (deleteMode === "occ" && !selectedOcc) ||
                  (deleteMode === "olt" && !selectedOlt)
                }
                variant="secondary"
              >
                🔍 Find HODPs to Delete
              </Button>

              {hodpsToDelete.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          selectedHodps.size === hodpsToDelete.length &&
                          hodpsToDelete.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Select All ({selectedHodps.size}/{hodpsToDelete.length})
                      </label>
                    </div>
                    <Badge variant="destructive">
                      {selectedHodps.size} selected
                    </Badge>
                  </div>

                  <Alert
                    variant={selectedHodps.size > 0 ? "destructive" : "default"}
                  >
                    <AlertDescription>
                      {selectedHodps.size > 0
                        ? `⚠️ You have selected ${selectedHodps.size} HODP(s) to delete. This action cannot be undone.`
                        : `ℹ️ Found ${hodpsToDelete.length} HODP(s). Select the ones you want to delete.`}
                    </AlertDescription>
                  </Alert>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Select</TableHead>
                          <TableHead>Node ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hodpsToDelete.map((hodp) => (
                          <TableRow key={hodp._id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedHodps.has(hodp._id)}
                                onCheckedChange={() =>
                                  toggleSelectHodp(hodp._id)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {hodp.node_id}
                            </TableCell>
                            <TableCell>{hodp.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {hodp.node_category}
                              </Badge>
                            </TableCell>
                            <TableCell>{hodp.region || "—"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  hodp.status === "existing"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {hodp.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="lg"
                        disabled={selectedHodps.size === 0}
                      >
                        🗑️ Bulk Delete Selected ({selectedHodps.size}) HODP(s)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete {selectedHodps.size}{" "}
                          HODP(s) and all their related links? This action
                          cannot be undone and will affect the network topology.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleBulkDelete}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Yes, Bulk Delete"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {((deleteMode === "occ" && selectedOcc) ||
                (deleteMode === "olt" && selectedOlt)) &&
                hodpsToDelete.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      ℹ️ No HODPs found under the selected{" "}
                      {deleteMode === "olt"
                        ? "OLT"
                        : selectedOdp && selectedOdp !== "all"
                          ? "ODP"
                          : "OCC"}
                      .
                    </AlertDescription>
                  </Alert>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unconnected" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>⚠️ Unconnected Nodes</span>
                <Badge variant="destructive">
                  {filteredUnconnectedNodes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                  size="sm"
                >
                  All ({unconnectedNodes.length})
                </Button>
                <Button
                  variant={filter === "existing" ? "default" : "outline"}
                  onClick={() => setFilter("existing")}
                  size="sm"
                >
                  Existing (
                  {
                    unconnectedNodes.filter((n) => n.status === "existing")
                      .length
                  }
                  )
                </Button>
                <Button
                  variant={filter === "proposed" ? "default" : "outline"}
                  onClick={() => setFilter("proposed")}
                  size="sm"
                >
                  Proposed (
                  {
                    unconnectedNodes.filter((n) => n.status === "proposed")
                      .length
                  }
                  )
                </Button>
              </div>
              {filteredUnconnectedNodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  🎉 All nodes are connected!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Node ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnconnectedNodes.map((node) => (
                      <TableRow key={node._id}>
                        <TableCell className="font-mono text-xs">
                          {node.node_id}
                        </TableCell>
                        <TableCell>{node.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {node.node_category}
                          </Badge>
                        </TableCell>
                        <TableCell>{node.region || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              node.status === "existing" ? "default" : "outline"
                            }
                          >
                            {node.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-4 pt-4">
        <Link href="/map">
          <Button size="lg">🗺 Open Map</Button>
        </Link>
        <Link href="/import">
          <Button variant="outline" size="lg">
            📥 Import Nodes
          </Button>
        </Link>
        <Link href="/nodes">
          <Button variant="outline" size="lg">
            📋 Node Table
          </Button>
        </Link>
      </div>
    </div>
  );
}