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

/* =========================
   🔒 TYPES
========================= */

type NodeCategory =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point';

type NodeType = {
  _id: string;
  node_id: string;
  node_category: NodeCategory;
  status: 'existing' | 'proposed';
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

/* =========================
   🏠 PAGE
========================= */

export default function Home() {
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [filter, setFilter] = useState<'all' | 'existing' | 'proposed'>('all');

  useEffect(() => {
    fetch('/api/nodes').then(res => res.json()).then(setNodes);
    fetch('/api/links').then(res => res.json()).then(setLinks);
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
    categoryStats[node.node_category].total++;

    if (node.status === 'existing') {
      categoryStats[node.node_category].existing++;
    } else {
      categoryStats[node.node_category].proposed++;
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

  const occSummary: Record<
    string,
    { odp: number; hodp: number; branch: number; total: number }
  > = {};

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
     🎨 UI
  ========================= */

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold text-center">
        GPON Planning Dashboard
      </h1>

      {/* SUMMARY */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Nodes</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{totalNodes}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Total Links</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{totalLinks}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Unconnected</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-500">
            {unconnectedNodes.length}
          </CardContent>
        </Card>
      </div>

      {/* EXISTING vs PROPOSED */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Existing Network</CardTitle></CardHeader>
          <CardContent className="flex justify-between">
            <span className="text-3xl text-green-600 font-bold">
              {existingNodes}
            </span>
            <Badge>LIVE</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Proposed Network</CardTitle></CardHeader>
          <CardContent className="flex justify-between">
            <span className="text-3xl text-orange-500 font-bold">
              {proposedNodes}
            </span>
            <Badge variant="outline">PLANNED</Badge>
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
              </TableRow>
            </TableHeader>

            <TableBody>
              {(Object.keys(categoryStats) as NodeCategory[]).map(cat => (
                <TableRow key={cat}>
                  <TableCell>{cat}</TableCell>

                  <TableCell className="text-center">
                    <Badge>{categoryStats[cat].existing}</Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {categoryStats[cat].proposed}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center font-bold">
                    {categoryStats[cat].total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* OCC SUMMARY */}
      <Card>
        <CardHeader>
          <CardTitle>📊 OCC Summary</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OCC</TableHead>
                <TableHead className="text-center">HODP</TableHead>
                <TableHead className="text-center">Branch</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.entries(occSummary).map(([occ, val]) => (
                <TableRow key={occ}>
                  <TableCell className="font-bold">{occ}</TableCell>
                  <TableCell className="text-center">{val.hodp}</TableCell>
                  <TableCell className="text-center">{val.branch}</TableCell>
                  <TableCell className="text-center font-bold">{val.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* UNCONNECTED */}
      <Card>
        <CardHeader>
          <CardTitle>
            ⚠️ Unconnected Nodes ({filteredUnconnectedNodes.length})
          </CardTitle>
        </CardHeader>

        <CardContent>

          <div className="flex gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>

            <Button
              variant={filter === 'existing' ? 'default' : 'outline'}
              onClick={() => setFilter('existing')}
            >
              Existing
            </Button>

            <Button
              variant={filter === 'proposed' ? 'default' : 'outline'}
              onClick={() => setFilter('proposed')}
            >
              Proposed
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredUnconnectedNodes.map(node => (
                <TableRow key={node._id}>
                  <TableCell>{node.node_id}</TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {node.node_category}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={node.status === 'existing' ? 'default' : 'outline'}>
                      {node.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        </CardContent>
      </Card>

      {/* NAV */}
      <div className="flex justify-center gap-4">
        <Link href="/map">
          <Button>🗺 Open Map</Button>
        </Link>

        <Link href="/nodes">
          <Button variant="outline">📋 Node Table</Button>
        </Link>
      </div>

    </div>
  );
}