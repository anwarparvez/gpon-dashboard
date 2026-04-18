'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function LinkTable() {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetch('/api/links')
      .then(res => res.json())
      .then(setLinks);
  }, []);

  // 🔍 Filter
  const filtered = useMemo(() => {
    return links.filter(l => {
      const text = `
        ${l.from_node?.node_id}
        ${l.to_node?.node_id}
        ${l.status}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [links, search]);

  useEffect(() => setPage(1), [search, pageSize]);

  const totalPages = pageSize === 'all'
    ? 1
    : Math.ceil(filtered.length / pageSize);

  const pageData = pageSize === 'all'
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  // 📤 Export
  const exportCSV = () => {
    const headers = ["from","to","length_km","fiber_core","used_core","status"];

    const rows = filtered.map(l => [
      l.from_node?.node_id,
      l.to_node?.node_id,
      l.length?.toFixed(3),
      l.fiber_core,
      l.used_core,
      l.status
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csv]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "links.csv";
    a.click();

    toast.success("📤 Exported");
  };

  // ✏️ Edit
  const openEdit = (link) => {
    setEditData({
      _id: link._id,
      fiber_core: link.fiber_core,
      used_core: link.used_core,
      status: link.status
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const res = await fetch('/api/links', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });

    const updated = await res.json();

    setLinks(prev => prev.map(l => l._id === updated._id ? updated : l));
    setEditOpen(false);

    toast.success("Updated");
  };

  // ❌ Delete
  const confirmDelete = async () => {
    await fetch('/api/links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteId })
    });

    setLinks(prev => prev.filter(l => l._id !== deleteId));
    setDeleteId(null);

    toast.success("Deleted");
  };

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
      <div className="flex gap-3 mb-4 flex-wrap">

        <Input
          placeholder="Search link..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

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

        <Button onClick={exportCSV}>Export</Button>

      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Distance (km)</TableHead>
            <TableHead>Core</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageData.map(link => (
            <TableRow key={link._id}>

              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(link._id)}
                  onCheckedChange={() => toggleSelect(link._id)}
                />
              </TableCell>

              <TableCell>{link.from_node?.node_id}</TableCell>
              <TableCell>{link.to_node?.node_id}</TableCell>

              {/* 🔥 AUTO DISTANCE */}
              <TableCell>
                {link.length ? link.length.toFixed(3) : '-'}
              </TableCell>

              <TableCell>{link.fiber_core}</TableCell>
              <TableCell>{link.used_core}</TableCell>
              <TableCell>{link.status}</TableCell>

              <TableCell className="flex gap-2">
                <Button size="sm" onClick={() => openEdit(link)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(link._id)}>
                  Delete
                </Button>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* PAGINATION */}
      <div className="flex justify-between mt-4">
        <span>Page {page} / {totalPages}</span>

        <div className="flex gap-2">
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Link</DialogTitle></DialogHeader>

          <Input
            type="number"
            value={editData.fiber_core}
            onChange={e => setEditData({ ...editData, fiber_core: e.target.value })}
            placeholder="Fiber Core"
          />

          <Input
            type="number"
            value={editData.used_core}
            onChange={e => setEditData({ ...editData, used_core: e.target.value })}
            placeholder="Used Core"
          />

          <DialogFooter>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Link?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}