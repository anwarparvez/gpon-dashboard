'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// shadcn
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function NodeTable() {
  const [nodes, setNodes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [editData, setEditData] = useState({});

  const router = useRouter();

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(setNodes);
  }, []);

  // 🔍 Filter
  const filtered = useMemo(() => {
    return nodes.filter(n => {
      const text = `
        ${n.node_id}
        ${n.name}
        ${n.node_code || ''}
        ${n.address || ''}
      `.toLowerCase();

      return text.includes(search.toLowerCase()) &&
        (statusFilter === 'all' || n.status === statusFilter);
    });
  }, [nodes, search, statusFilter]);

  // 🔁 Reset page
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  // 📄 Pagination
  const totalPages = pageSize === 'all'
    ? 1
    : Math.ceil(filtered.length / pageSize);

  const pageData = pageSize === 'all'
    ? filtered
    : filtered.slice(
        (page - 1) * pageSize,
        page * pageSize
      );

  // 📤 Export
  const exportCSV = () => {
    const headers = [
      "node_id","name","latitude","longitude",
      "node_category","status","dgm","region",
      "node_code","address"
    ];

    const rows = filtered.map(n => [
      n.node_id,
      `"${n.name}"`,
      n.latitude,
      n.longitude,
      n.node_category,
      n.status,
      `"${n.dgm || ''}"`,
      n.region,
      n.node_code || '',
      `"${n.address || ''}"`
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "nodes_export.csv";
    a.click();

    toast.success("📤 CSV exported");
  };

  // ✏️ Edit
  const openEdit = (node) => {
    setEditData({
      _id: node._id,
      name: node.name || '',
      node_category: node.node_category || 'HODP',
      status: node.status || 'proposed',
      dgm: node.dgm || '',
      region: node.region || '',
      latitude: node.latitude || '',
      longitude: node.longitude || '',
      node_code: node.node_code || '',
      address: node.address || ''
    });

    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (!res.ok) throw new Error();

      const updated = await res.json();

      setNodes(prev =>
        prev.map(n => n._id === updated._id ? updated : n)
      );

      toast.success("✅ Node updated");
      setEditOpen(false);

    } catch {
      toast.error("❌ Update failed");
    }
  };

  // ❌ Delete
  const confirmDelete = async () => {
    try {
      await fetch('/api/nodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId })
      });

      setNodes(prev => prev.filter(n => n._id !== deleteId));
      toast.success("🗑 Node deleted");

    } catch {
      toast.error("❌ Delete failed");
    }

    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch('/api/nodes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          })
        )
      );

      setNodes(prev => prev.filter(n => !selectedIds.includes(n._id)));
      toast.success(`🗑 ${selectedIds.length} nodes deleted`);
      setSelectedIds([]);

    } catch {
      toast.error("❌ Bulk delete failed");
    }
  };

  // ☑️ Select
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex flex-wrap gap-3 mb-4">

        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <Select onValueChange={setStatusFilter} defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="existing">Existing</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setPageSize(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={exportCSV}>Export CSV</Button>

        <Button variant="destructive" onClick={handleBulkDelete}>
          Delete Selected ({selectedIds.length})
        </Button>

      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageData.map(node => (
            <TableRow key={node._id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(node._id)}
                  onCheckedChange={() => toggleSelect(node._id)}
                />
              </TableCell>

              <TableCell>{node.node_id}</TableCell>
              <TableCell>{node.name}</TableCell>
              <TableCell>{node.status}</TableCell>
              <TableCell>{node.node_code || '-'}</TableCell>

              <TableCell className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/node/${node._id}`)}>
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(node)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(node._id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-4">
        <span>Page {page} of {totalPages}</span>

        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Prev
          </Button>

          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
            <Input value={editData.node_code} onChange={e => setEditData({ ...editData, node_code: e.target.value })} />
            <Input value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Node?</DialogTitle>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}