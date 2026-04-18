'use client';

import { useState } from 'react';
import ConfirmModal from './ConfirmModal';

export default function DeleteLinkButton({ link, setLinks }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    console.log("🗑 Deleting link:", link._id);

    try {
      const res = await fetch('/api/links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link._id })
      });

      const data = await res.json();
      console.log("📦 API Response:", data);

      if (!res.ok) {
        alert(data.error || "Delete failed");
        setLoading(false);
        return;
      }

      // ✅ Remove link from UI
      setLinks(prev =>
        prev.filter(l => String(l._id) !== String(link._id))
      );

      console.log("✅ Link removed from UI");

      setOpen(false);

    } catch (err) {
      console.error("❌ Delete error:", err);
    }

    setLoading(false);
  };

  return (
    <>
      {/* 🔴 Button inside popup */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // 🔥 important for Leaflet
          setOpen(true);
        }}
        className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded"
      >
        🗑 Delete Link
      </button>

      {/* 🧩 Confirmation Modal */}
      <ConfirmModal
        open={open}
        title="Delete Link"
        message={`Delete link ${link.from_node?.node_id || link.from_node} → ${link.to_node?.node_id || link.to_node}?`}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />

      {/* 🔄 Loading indicator */}
      {loading && (
        <div className="fixed top-2 right-2 bg-black text-white px-3 py-1 rounded z-[4000]">
          Deleting link...
        </div>
      )}
    </>
  );
}