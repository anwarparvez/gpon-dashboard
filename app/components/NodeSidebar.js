'use client';

export default function NodeSidebar({ draft, setDraft, setNodes }) {

  if (!draft) return null;

  const handleSave = async () => {
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Save failed");
        return;
      }

      setNodes(prev => [data, ...prev]);
      setDraft(null);

    } catch (err) {
      console.error(err);
      alert("Error saving node");
    }
  };

  return (
    <div className="fixed right-0 top-[60px] w-[320px] h-[calc(100%-60px)] bg-gray-900 text-white p-4 z-[2000] overflow-y-auto">

      <h3 className="text-lg font-bold mb-4">Add Node</h3>

      {/* Name */}
      <input
        className="w-full p-2 mb-3 text-black rounded"
        placeholder="Node Name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />

      {/* Category */}
      <select
        className="w-full p-2 mb-3 text-black rounded"
        value={draft.node_category}
        onChange={(e) => setDraft({ ...draft, node_category: e.target.value })}
      >
        <option>OLT</option>
        <option>OCC</option>
        <option>ODP</option>
        <option>HODP</option>
      </select>

      {/* Status */}
      <select
        className="w-full p-2 mb-3 text-black rounded"
        value={draft.status}
        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
      >
        <option value="existing">Existing</option>
        <option value="proposed">Proposed</option>
      </select>

      {/* DGM */}
      <input
        className="w-full p-2 mb-3 text-black rounded"
        value={draft.dgm}
        onChange={(e) => setDraft({ ...draft, dgm: e.target.value })}
      />

      {/* Region */}
      <input
        className="w-full p-2 mb-3 text-black rounded"
        value={draft.region}
        onChange={(e) => setDraft({ ...draft, region: e.target.value })}
      />

      {/* Coordinates */}
      <div className="text-sm mb-3">
        📍 {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
      </div>

      <input
        placeholder="Node Code (optional)"
        value={draft.node_code || ''}
        onChange={e => setDraft({ ...draft, node_code: e.target.value })}
        className="input"
      />

      <input
        placeholder="Address"
        value={draft.address || ''}
        onChange={e => setDraft({ ...draft, address: e.target.value })}
        className="input"
      />

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-green-600 hover:bg-green-700 p-2 rounded"
        >
          Save
        </button>

        <button
          onClick={() => setDraft(null)}
          className="flex-1 bg-red-600 hover:bg-red-700 p-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}