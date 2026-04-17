'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NodeTable() {
  const [nodes, setNodes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortKey, setSortKey] = useState('node_id');
  const [sortDir, setSortDir] = useState('asc');

  const [selectedIds, setSelectedIds] = useState([]);

  const router = useRouter();

  // 📡 Load
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => Array.isArray(data) && setNodes(data));
  }, []);

  // 🔍 Filter
  const filtered = useMemo(() => {
    return nodes.filter(n => {
      const text = `${n.node_id} ${n.name} ${n.node_category} ${n.region}`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || n.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [nodes, search, statusFilter]);

  // 🔼 Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const A = (a[sortKey] ?? '').toString().toLowerCase();
      const B = (b[sortKey] ?? '').toString().toLowerCase();

      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // 📄 Pagination
  const totalPages = pageSize === 'all'
    ? 1
    : Math.ceil(sorted.length / pageSize);

  const pageData = pageSize === 'all'
    ? sorted
    : sorted.slice((page - 1) * pageSize, page * pageSize);

  // 🔼 Sort toggle
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ❌ Delete single
  const handleDelete = async (id) => {
    if (!confirm("Delete this node?")) return;

    await fetch('/api/nodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    setNodes(prev =>
      prev.filter(n => String(n._id) !== String(id))
    );
  };

  // ❌ Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} nodes?`)) return;

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
    setSelectedIds([]);
  };

  // ☑️ Select
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const ids = pageData.map(n => n._id);
    const allSelected = ids.every(id => selectedIds.includes(id));

    setSelectedIds(allSelected
      ? selectedIds.filter(id => !ids.includes(id))
      : [...new Set([...selectedIds, ...ids])]
    );
  };

  // 📤 Export
  const exportFilteredCSV = () => {
    const headers = ["node_id","name","latitude","longitude","node_category","status","dgm","region"];

    const rows = sorted.map(n => [
      n.node_id,
      `"${n.name}"`,
      n.latitude,
      n.longitude,
      n.node_category,
      n.status,
      `"${n.dgm || ''}"`,
      n.region
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_nodes.csv";
    a.click();
  };

  const SortHeader = ({ label, field }) => (
    <th
      onClick={() => handleSort(field)}
      className="cursor-pointer"
    >
      {label} {sortKey === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div className="p-4 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">

      {/* Header */}
      <div className="flex flex-wrap gap-2 justify-between mb-4 items-center">

        <h2 className="text-xl font-bold">📊 Node Table</h2>

        <input
          placeholder="Search..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded bg-white dark:bg-gray-800"
        />

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded bg-white dark:bg-gray-800"
        >
          <option value="all">All</option>
          <option value="existing">Existing</option>
          <option value="proposed">Proposed</option>
        </select>

        {/* 📊 Rows per page */}
        <select
          value={pageSize}
          onChange={(e) => {
            const value = e.target.value === 'all'
              ? 'all'
              : Number(e.target.value);
            setPageSize(value);
            setPage(1);
          }}
          className="border px-2 py-1 rounded bg-white dark:bg-gray-800"
        >
          <option value={10}>10</option>
          <option value={100}>100</option>
          <option value={1000}>1000</option>
          <option value="all">All</option>
        </select>

        <button onClick={exportFilteredCSV} className="bg-green-600 text-white px-3 py-1 rounded">
          Export
        </button>

        <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1 rounded">
          Delete Selected ({selectedIds.length})
        </button>

      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[70vh] border rounded">
        <table className="w-full text-sm">

          <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700">
            <tr>
              <th>
                <input type="checkbox" onChange={toggleSelectAll} />
              </th>
              <SortHeader label="ID" field="node_id" />
              <SortHeader label="Name" field="name" />
              <SortHeader label="Category" field="node_category" />
              <SortHeader label="Status" field="status" />
              <SortHeader label="Region" field="region" />
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {pageData.map(node => (
              <tr key={node._id} className="border-t hover:bg-gray-100 dark:hover:bg-gray-800">

                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(node._id)}
                    onChange={() => toggleSelect(node._id)}
                  />
                </td>

                <td>{node.node_id}</td>
                <td>{node.name}</td>
                <td>{node.node_category}</td>
                <td>{node.status}</td>
                <td>{node.region}</td>

                <td className="flex gap-2">
                  <button onClick={() => router.push(`/node/${node._id}`)} className="bg-green-500 px-2 rounded text-white">
                    View
                  </button>
                  <button onClick={() => handleDelete(node._id)} className="bg-red-600 px-2 rounded text-white">
                    Delete
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* Pagination */}
      {pageSize !== 'all' && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 bg-gray-400 rounded">Prev</button>
          <span>Page {page} / {totalPages || 1}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-2 bg-gray-400 rounded">Next</button>
        </div>
      )}

    </div>
  );
}