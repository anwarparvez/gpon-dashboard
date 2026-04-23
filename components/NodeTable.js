"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// shadcn
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";

export default function NodeTable() {

  const [nodes, setNodes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // ✏️ INLINE EDIT STATE
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const router = useRouter();

  /* =========================
     FETCH
  ========================= */
  useEffect(() => {
    fetch("/api/nodes")
      .then(res => res.json())
      .then(setNodes);
  }, []);

  /* =========================
     FILTER
  ========================= */
  const filtered = useMemo(() => {
    return nodes.filter(n => {
      const text = `
        ${n.node_id}
        ${n.name}
        ${n.node_code || ""}
        ${n.address || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (statusFilter === "all" || n.status === statusFilter) &&
        (categoryFilter === "all" || n.node_category === categoryFilter)
      );
    });
  }, [nodes, search, statusFilter, categoryFilter]);

  /* =========================
     PAGINATION
  ========================= */
  const numericPageSize =
    pageSize === "all" ? filtered.length : Number(pageSize);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / numericPageSize)
  );

  const pageData = filtered.slice(
    (page - 1) * numericPageSize,
    page * numericPageSize
  );

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filtered.length, pageSize]);

  /* =========================
     EDIT HANDLERS
  ========================= */
  const startEdit = (node) => {
    setEditingId(node._id);
    setEditData({ ...node });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    try {
      const res = await fetch("/api/nodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData)
      });

      const updated = await res.json();

      setNodes(prev =>
        prev.map(n => (n._id === updated._id ? updated : n))
      );

      setEditingId(null);
      toast.success("✅ Updated");

    } catch {
      toast.error("❌ Update failed");
    }
  };

  /* =========================
     DELETE
  ========================= */
  const deleteNode = async (id) => {
    if (!confirm("Delete node?")) return;

    await fetch("/api/nodes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    setNodes(prev => prev.filter(n => n._id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="p-6 space-y-4">

      {/* FILTER BAR */}
      <div className="flex gap-3 flex-wrap">

        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <Select onValueChange={setStatusFilter} defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="existing">Existing</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setCategoryFilter} defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="OCC">OCC</SelectItem>
            <SelectItem value="ODP">ODP</SelectItem>
            <SelectItem value="HODP">HODP</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setPageSize(v === "all" ? "all" : Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lat</TableHead>
            <TableHead>Lng</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>DGM</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageData.map(node => {
            const isEditing = editingId === node._id;

            return (
              <TableRow key={node._id}>

                <TableCell>{node.node_id}</TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.name || ""}
                      onChange={e =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                    />
                  ) : node.name}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editData.node_category}
                      onValueChange={v =>
                        setEditData({ ...editData, node_category: v })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OCC">OCC</SelectItem>
                        <SelectItem value="ODP">ODP</SelectItem>
                        <SelectItem value="HODP">HODP</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : node.node_category}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editData.status}
                      onValueChange={v =>
                        setEditData({ ...editData, status: v })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="existing">Existing</SelectItem>
                        <SelectItem value="proposed">Proposed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : node.status}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.latitude || ""}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          latitude: Number(e.target.value)
                        })
                      }
                    />
                  ) : node.latitude?.toFixed(5)}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.longitude || ""}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          longitude: Number(e.target.value)
                        })
                      }
                    />
                  ) : node.longitude?.toFixed(5)}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.region || ""}
                      onChange={e =>
                        setEditData({ ...editData, region: e.target.value })
                      }
                    />
                  ) : node.region}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.dgm || ""}
                      onChange={e =>
                        setEditData({ ...editData, dgm: e.target.value })
                      }
                    />
                  ) : node.dgm}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.node_code || ""}
                      onChange={e =>
                        setEditData({ ...editData, node_code: e.target.value })
                      }
                    />
                  ) : node.node_code || "-"}
                </TableCell>

                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.address || ""}
                      onChange={e =>
                        setEditData({ ...editData, address: e.target.value })
                      }
                    />
                  ) : node.address || "-"}
                </TableCell>

                <TableCell className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={saveEdit}>
                        💾 Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => startEdit(node)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteNode(node._id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* PAGINATION */}
      <div className="flex justify-between items-center">
        <span>Page {page} of {totalPages}</span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Prev
          </Button>

          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

    </div>
  );
}