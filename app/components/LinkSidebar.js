'use client';

import { useState, useEffect } from 'react';

export default function LinkSidebar({
  selectedNodes,
  setSelectedNodes,
  setLinks
}) {

  const [fiberCore, setFiberCore] = useState(12);

  console.log("🔗 Selected Nodes:", selectedNodes);

  // 🔥 Only show when exactly 2 nodes selected
  if (selectedNodes.length !== 2) return null;

  const [nodeA, nodeB] = selectedNodes;

  const createLink = async () => {
    console.log("🚀 Creating link between:", nodeA.node_id, nodeB.node_id);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: nodeA._id,
          to: nodeB._id,
          fiber_core: fiberCore
        })
      });

      const data = await res.json();

      console.log("📦 Link API response:", data);

      if (!res.ok) {
        alert(data.error || "Failed to create link");
        return;
      }

      setLinks(prev => [...prev, data]);
      setSelectedNodes([]);

      console.log("✅ Link created");

    } catch (err) {
      console.error("❌ Link error:", err);
      alert("Server error");
    }
  };

  return (
    <div className="fixed right-0 top-[60px] w-[320px] h-[calc(100%-60px)] bg-white dark:bg-gray-900 text-black dark:text-white p-4 z-[2000]">

      <h3 className="text-lg font-bold mb-4">Create Link</h3>

      <div className="mb-3">
        <b>From:</b> {nodeA.node_id}
      </div>

      <div className="mb-3">
        <b>To:</b> {nodeB.node_id}
      </div>

      {/* Fiber Core */}
      <select
        className="w-full p-2 mb-3 rounded border dark:bg-gray-800"
        value={fiberCore}
        onChange={(e) => setFiberCore(Number(e.target.value))}
      >
        <option value={12}>12 Core</option>
        <option value={24}>24 Core</option>
        <option value={48}>48 Core</option>
        <option value={96}>96 Core</option>
      </select>

      <div className="flex gap-2">
        <button
          onClick={createLink}
          className="flex-1 bg-blue-600 text-white p-2 rounded"
        >
          Create Link
        </button>

        <button
          onClick={() => setSelectedNodes([])}
          className="flex-1 bg-red-500 text-white p-2 rounded"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}