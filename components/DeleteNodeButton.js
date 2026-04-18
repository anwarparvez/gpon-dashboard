'use client';

import { useState } from 'react';
import ConfirmModal from './ConfirmModal';

export default function DeleteNodeButton({ node, setNodes, setLinks }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    console.log("🗑 Deleting:", node._id);

    try {
      const res = await fetch('/api/nodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node._id })
      });

      const data = await res.json();
      console.log("📦 API:", data);

      if (!res.ok) {
        alert(data.error || "Delete failed");
        setLoading(false);
        return;
      }

      // ✅ remove node (safe string compare)
      setNodes(prev =>
        prev.filter(n => String(n._id) !== String(node._id))
      );

      // ✅ remove connected links
      setLinks(prev =>
        prev.filter(l => {
          const fromId = String(l.from_node?._id || l.from_node);
          const toId = String(l.to_node?._id || l.to_node);
          return fromId !== String(node._id) && toId !== String(node._id);
        })
      );

      setOpen(false);
      console.log("✅ Deleted + UI updated");

    } catch (err) {
      console.error("❌ Delete error:", err);
    }

    setLoading(false);
  };

  return (
    <>
      {/* 🔴 Button inside Leaflet popup */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // 🔥 IMPORTANT for Leaflet
          setOpen(true);
        }}
        className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded"
      >
        🗑 Delete Node
      </button>

      {/* 🧩 Modal (outside popup behavior issues) */}
      <ConfirmModal
        open={open}
        title="Delete Node"
        message={`Are you sure you want to delete ${node.node_id}?`}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />

      {/* Optional loading indicator */}
      {loading && (
        <div className="fixed top-2 right-2 bg-black text-white px-3 py-1 rounded z-[4000]">
          Deleting...
        </div>
      )}
    </>
  );
}