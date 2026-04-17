'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NodeTable() {
  const [nodes, setNodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const router = useRouter();
  
  // 📡 Load nodes
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNodes(data);
      });
  }, []);

  // ✏ Edit
  const handleEdit = (node) => {
    setEditingId(node._id);
    setEditData(node);
  };

  // 💾 Save
  const handleSave = async () => {
    const res = await fetch('/api/nodes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });

    const updated = await res.json();

    setNodes(prev =>
      prev.map(n => (n._id === updated._id ? updated : n))
    );

    setEditingId(null);
  };

  // ❌ Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this node?")) return;

    await fetch('/api/nodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    setNodes(prev => prev.filter(n => n._id !== id));
  };

  // 📥 Export CSV
  const exportToCSV = () => {
    const headers = [
      "node_id", "name", "latitude", "longitude",
      "node_category", "status", "dgm", "region"
    ];

    const rows = nodes.map(n => [
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
    a.download = "gpon_nodes.csv";
    a.click();
  };

  return (
    <div className="p-4 bg-gray-900 text-white">

      {/* Header */}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">📊 Node Table</h2>

        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto bg-gray-800 rounded shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-2">ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>DGM</th>
              <th>Region</th>
              <th>Lat</th>
              <th>Lon</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {nodes.map(node => (
              <tr key={node._id} className="border-t border-gray-700 hover:bg-gray-700">

                <td className="p-2">{node.node_id}</td>

                {/* Name */}
                <td>
                  {editingId === node._id ? (
                    <input
                      value={editData.name}
                      onChange={e =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className="bg-gray-900 border p-1"
                    />
                  ) : node.name}
                </td>

                {/* Category */}
                <td>
                  {editingId === node._id ? (
                    <select
                      value={editData.node_category}
                      onChange={e =>
                        setEditData({ ...editData, node_category: e.target.value })
                      }
                      className="bg-gray-900 border p-1"
                    >
                      <option>OLT</option>
                      <option>OCC</option>
                      <option>ODP</option>
                      <option>HODP</option>
                      <option>Branch Point</option>
                    </select>
                  ) : node.node_category}
                </td>

                {/* Status */}
                <td>
                  {editingId === node._id ? (
                    <select
                      value={editData.status}
                      onChange={e =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className="bg-gray-900 border p-1"
                    >
                      <option value="existing">Existing</option>
                      <option value="proposed">Proposed</option>
                    </select>
                  ) : (
                    <span className={node.status === 'existing' ? 'text-green-400' : 'text-yellow-400'}>
                      {node.status}
                    </span>
                  )}
                </td>

                {/* DGM */}
                <td>
                  {editingId === node._id ? (
                    <input
                      value={editData.dgm || ''}
                      onChange={e =>
                        setEditData({ ...editData, dgm: e.target.value })
                      }
                      className="bg-gray-900 border p-1"
                    />
                  ) : node.dgm}
                </td>

                {/* Region */}
                <td>
                  {editingId === node._id ? (
                    <input
                      value={editData.region || ''}
                      onChange={e =>
                        setEditData({ ...editData, region: e.target.value })
                      }
                      className="bg-gray-900 border p-1"
                    />
                  ) : node.region}
                </td>

                <td>{node.latitude}</td>
                <td>{node.longitude}</td>

                {/* Actions */}
                <td className="flex gap-2">
                  <button
                    onClick={() => router.push(`/node/${node._id}`)}
                    className="bg-green-600 px-2 py-1 rounded"
                  >
                    View
                  </button>
                  {editingId === node._id ? (
                    <>
                      <button onClick={handleSave} className="bg-blue-600 px-2 py-1 rounded">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-500 px-2 py-1 rounded">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(node)} className="bg-yellow-500 px-2 py-1 rounded">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(node._id)} className="bg-red-600 px-2 py-1 rounded">
                        Delete
                      </button>
                    </>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}