'use client';

import { useState, useMemo } from 'react';
import { validateLink } from '@/lib/gponRules';

export default function LinkSidebar({
  selectedNodes,
  setSelectedNodes,
  setLinks
}) {

  const [fiberCore, setFiberCore] = useState(12);
  const [loading, setLoading] = useState(false);

  // 🧠 Always define nodes safely
  const nodeA = selectedNodes[0];
  const nodeB = selectedNodes[1];

  // 🧠 Always run hook (SAFE now)
  const validation = useMemo(() => {
    if (!nodeA || !nodeB) {
      return { valid: false, error: "Select 2 nodes" };
    }
    return validateLink(nodeA, nodeB);
  }, [nodeA, nodeB]);

  // 🚫 AFTER hooks → safe return
  if (selectedNodes.length !== 2) return null;

  // 🔄 Apply auto-fix
  let from = nodeA;
  let to = nodeB;

  if (validation.valid) {
    from = validation.fromNode;
    to = validation.toNode;
  }

  const createLink = async () => {

    if (!validation.valid) return;

    setLoading(true);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from._id,
          to: to._id,
          fiber_core: fiberCore,
          fiber_type: validation.fiber_type
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create link");
        setLoading(false);
        return;
      }

      setLinks(prev => [...prev, data]);
      setSelectedNodes([]);

    } catch (err) {
      console.error("❌ Link error:", err);
      alert("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="fixed right-0 top-[60px] w-[320px] h-[calc(100%-60px)] bg-white dark:bg-gray-900 text-black dark:text-white p-4 z-[2000] shadow-lg">

      <h3 className="text-lg font-bold mb-4">Create Link</h3>

      <div className="mb-2">
        <b>From:</b> {from.node_id} ({from.node_category})
      </div>

      <div className="mb-3">
        <b>To:</b> {to.node_id} ({to.node_category})
      </div>

      {!validation.valid && (
        <div className="mb-3 p-2 text-sm bg-red-100 text-red-700 rounded">
          ❌ {validation.error}
        </div>
      )}

      {validation.valid && (
        <div className="mb-3 p-2 text-sm bg-green-100 text-green-700 rounded">
          ✅ {validation.fiber_type} Fiber
          {validation.reversed && " (Auto-fixed)"}
        </div>
      )}

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
          disabled={!validation.valid || loading}
          className={`flex-1 p-2 rounded text-white ${
            validation.valid
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? "Creating..." : "Create Link"}
        </button>

        <button
          onClick={() => setSelectedNodes([])}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}