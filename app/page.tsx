'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ✅ shadcn */
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* =========================
   🔒 TYPES
========================= */

type NodeCategory =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point';

type NodeStatus = 'existing' | 'proposed';

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
};

type CategoryStat = {
  existing: number;
  proposed: number;
  total: number;
};

type OccSummaryType = {
  odp: number;
  hodp: number;
  branch: number;
  total: number;
};

/* =========================
   🏠 PAGE
========================= */

export default function Home() {
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [filter, setFilter] = useState<'all' | 'existing' | 'proposed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [nodesRes, linksRes] = await Promise.all([
          fetch('/api/nodes'),
          fetch('/api/links')
        ]);

        if (!nodesRes.ok) throw new Error('Failed to fetch nodes');
        if (!linksRes.ok) throw new Error('Failed to fetch links');

        const nodesData = await nodesRes.json();
        const linksData = await linksRes.json();

        setNodes(nodesData);
        setLinks(linksData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
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

  const existingNodes = nodes.filter(n => n.status === 'existing').length;
  const proposedNodes = nodes.filter(n => n.status === 'proposed').length;

  /* =========================
     📊 CATEGORY STATS
  ========================= */

  const categoryStats: Record<NodeCategory, CategoryStat> = {
    OLT: { existing: 0, proposed: 0, total: 0 },
    OCC: { existing: 0, proposed: 0, total: 0 },
    ODP: { existing: 0, proposed: 0, total: 0 },
    HODP: { existing: 0, proposed: 0, total: 0 },
    'Branch Point': { existing: 0, proposed: 0, total: 0 }
  };

  nodes.forEach(node => {
    if (categoryStats[node.node_category]) {
      categoryStats[node.node_category].total++;

      if (node.status === 'existing') {
        categoryStats[node.node_category].existing++;
      } else {
        categoryStats[node.node_category].proposed++;
      }
    }
  });

  /* =========================
     🔗 OCC SUMMARY
  ========================= */

  const nodeMap = new Map(nodes.map(n => [n._id, n]));
  const odpToOcc: Record<string, string> = {};

  links.forEach(link => {
    const from = nodeMap.get(link.from_node?._id || link.from_node);
    const to = nodeMap.get(link.to_node?._id || link.to_node);

    if (!from || !to) return;

    if (from.node_category === 'OCC' && to.node_category === 'ODP') {
      odpToOcc[to.node_id] = from.node_id;
    }

    if (to.node_category === 'OCC' && from.node_category === 'ODP') {
      odpToOcc[from.node_id] = to.node_id;
    }
  });

  const occSummary: Record<string, OccSummaryType> = {};

  links.forEach(link => {
    const from = nodeMap.get(link.from_node?._id || link.from_node);
    const to = nodeMap.get(link.to_node?._id || link.to_node);

    if (!from || !to) return;

    let odp: any = null;
    let other: any = null;

    if (from.node_category === 'ODP') {
      odp = from;
      other = to;
    } else if (to.node_category === 'ODP') {
      odp = to;
      other = from;
    }

    if (!odp || !other) return;

    const occ = odpToOcc[odp.node_id];
    if (!occ) return;

    if (!occSummary[occ]) {
      occSummary[occ] = { odp: 0, hodp: 0, branch: 0, total: 0 };
    }

    occSummary[occ].total++;

    if (other.node_category === 'HODP') {
      occSummary[occ].hodp++;
    }

    if (other.node_category === 'Branch Point') {
      occSummary[occ].branch++;
    }
  });

  /* =========================
     🚫 UNCONNECTED
  ========================= */

  const connectedSet = new Set<string>();

  links.forEach(link => {
    connectedSet.add(String(link.from_node?._id || link.from_node));
    connectedSet.add(String(link.to_node?._id || link.to_node));
  });

  const unconnectedNodes = nodes.filter(
    n => !connectedSet.has(String(n._id))
  );

  const filteredUnconnectedNodes = unconnectedNodes.filter(n => {
    if (filter === 'all') return true;
    return n.status === filter;
  });

  /* =========================
     📊 PROPOSED VS EXISTING BY REGION
  ========================= */

  const regionStats: Record<string, { existing: number; proposed: number }> = {};

  nodes.forEach(node => {
    const region = node.region || 'Unknown';
    if (!regionStats[region]) {
      regionStats[region] = { existing: 0, proposed: 0 };
    }
    if (node.status === 'existing') {
      regionStats[region].existing++;
    } else {
      regionStats[region].proposed++;
    }
  });

  /* =========================
     🎨 UI
  ========================= */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">GPON Planning Dashboard</h1>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-16" /></CardContent>
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
          <AlertDescription>
            Error loading dashboard: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          GPON Planning Dashboard
        </h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* SUMMARY CARDS */}
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
              {Math.round((existingNodes / totalNodes) * 100) || 0}% Existing
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
              {Math.round((unconnectedNodes.length / totalNodes) * 100) || 0}% of total
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
              {Math.round(((totalNodes - unconnectedNodes.length) / totalNodes) * 100) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected nodes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* EXISTING vs PROPOSED */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Existing Network
              <Badge variant="default" className="bg-green-600">LIVE</Badge>
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
              {Math.round((existingNodes / totalNodes) * 100)}% of total nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Proposed Network
              <Badge variant="outline" className="border-orange-500 text-orange-500">
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
              {Math.round((proposedNodes / totalNodes) * 100)}% of total nodes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CATEGORY TABLE */}
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
              {(Object.keys(categoryStats) as NodeCategory[]).map(cat => (
                <TableRow key={cat}>
                  <TableCell className="font-medium">{cat}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{categoryStats[cat].existing}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{categoryStats[cat].proposed}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {categoryStats[cat].total}
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.round((categoryStats[cat].total / totalNodes) * 100) || 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* REGION STATS */}
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
                  .sort((a, b) => (b[1].existing + b[1].proposed) - (a[1].existing + a[1].proposed))
                  .map(([region, stats]) => (
                    <TableRow key={region}>
                      <TableCell className="font-medium">{region}</TableCell>
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

      {/* OCC SUMMARY */}
      {Object.keys(occSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 OCC Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              ODPs connected to each OCC with their downstream nodes
            </p>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OCC</TableHead>
                  <TableHead className="text-center">ODPs</TableHead>
                  <TableHead className="text-center">HODPs</TableHead>
                  <TableHead className="text-center">Branch Points</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {Object.entries(occSummary).map(([occ, val]) => (
                  <TableRow key={occ}>
                    <TableCell className="font-bold">{occ}</TableCell>
                    <TableCell className="text-center">{val.odp || 0}</TableCell>
                    <TableCell className="text-center">{val.hodp}</TableCell>
                    <TableCell className="text-center">{val.branch}</TableCell>
                    <TableCell className="text-center font-bold">{val.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* UNCONNECTED NODES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>⚠️ Unconnected Nodes</span>
            <Badge variant="destructive">{filteredUnconnectedNodes.length}</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All ({unconnectedNodes.length})
            </Button>

            <Button
              variant={filter === 'existing' ? 'default' : 'outline'}
              onClick={() => setFilter('existing')}
              size="sm"
            >
              Existing ({unconnectedNodes.filter(n => n.status === 'existing').length})
            </Button>

            <Button
              variant={filter === 'proposed' ? 'default' : 'outline'}
              onClick={() => setFilter('proposed')}
              size="sm"
            >
              Proposed ({unconnectedNodes.filter(n => n.status === 'proposed').length})
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
                {filteredUnconnectedNodes.map(node => (
                  <TableRow key={node._id}>
                    <TableCell className="font-mono text-xs">{node.node_id}</TableCell>
                    <TableCell>{node.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {node.node_category}
                      </Badge>
                    </TableCell>
                    <TableCell>{node.region || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={node.status === 'existing' ? 'default' : 'outline'}>
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

      {/* NAVIGATION BUTTONS */}
      <div className="flex justify-center gap-4">
        <Link href="/map">
          <Button size="lg">
            🗺 Open Map
          </Button>
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