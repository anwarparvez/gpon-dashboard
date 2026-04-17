'use client';

import { useEffect, useState } from 'react';

export default function NodeTable() {
  const [nodes, setNodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Load data
  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNodes(data);
      });
  }, []);

  // Start edit
  const handleEdit = (node) => {
    setEditingId(node._id);
    setEditData(node);
  };

  // Save edit
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

  // Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this node?")) return;

    await fetch('/api/nodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    setNodes(prev => prev.filter(n => n._id !== id));
  };

  return (
    <table border="1" cellPadding="8" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Category</th>
          <th>Latitude</th>
          <th>Longitude</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {nodes.map(node => (
          <tr key={node._id}>
            <td>{node.node_id}</td>

            <td>
              {editingId === node._id ? (
                <input
                  value={editData.name}
                  onChange={e =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                />
              ) : node.name}
            </td>

            <td>
              {editingId === node._id ? (
                <select
                  value={editData.node_category}
                  onChange={e =>
                    setEditData({ ...editData, node_category: e.target.value })
                  }
                >
                  <option>OLT</option>
                  <option>OCC</option>
                  <option>ODP</option>
                  <option>HODP</option>
                  <option>Branch Point</option>
                </select>
              ) : node.node_category}
            </td>

            <td>{node.latitude}</td>
            <td>{node.longitude}</td>

            <td>
              {editingId === node._id ? (
                <>
                  <button onClick={handleSave}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => handleEdit(node)}>Edit</button>
                  <button onClick={() => handleDelete(node._id)}>Delete</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}