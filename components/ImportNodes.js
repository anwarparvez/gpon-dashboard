'use client';

import { useState } from 'react';
import Papa from 'papaparse';

export default function ImportNodes() {
  const [data, setData] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📂 Parse CSV
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {

        const rows = results.data.map(r => ({
          node_id: r.node_id?.trim(),
          name: r.name,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          node_category: r.node_category,
          status: r.status,
          dgm: r.dgm,
          region: r.region,
          node_code: r.node_code,
          address: r.address
        }));

        // 🔁 DUPLICATE CHECK (CSV)
        const seen = new Set();
        const dup = [];

        rows.forEach(r => {
          if (seen.has(r.node_id)) {
            dup.push(r.node_id);
          } else {
            seen.add(r.node_id);
          }
        });

        setDuplicates(dup);

        if (dup.length > 0) {
          alert("❌ Duplicate node_id in CSV");
          return;
        }

        // 🔍 FETCH EXISTING DB DATA
        const res = await fetch('/api/nodes');
        const dbNodes = await res.json();

        const map = {};
        dbNodes.forEach(n => {
          map[n.node_id] = n;
        });

        // 🔥 BUILD PREVIEW
        const result = rows.map(r => {

          const existing = map[r.node_id];

          if (!existing) {
            return { ...r, type: 'insert' };
          }

          // 🔄 DIFF CHECK
          const changes = {};

          Object.keys(r).forEach(key => {
            if (r[key] !== existing[key]) {
              changes[key] = {
                old: existing[key],
                new: r[key]
              };
            }
          });

          return {
            ...r,
            type: 'update',
            changes
          };
        });

        setPreview(result);
        setData(rows);
      }
    });
  };

  // 🚀 Upload
  const handleUpload = async () => {
    setLoading(true);

    await fetch('/api/nodes/bulk-upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    alert("✅ Upload complete");
    setLoading(false);
  };

  return (
    <div className="p-4">

      <h2 className="text-xl font-bold mb-3">📂 Import with Preview</h2>

      <input type="file" onChange={handleFile} />

      {/* ❌ DUPLICATES */}
      {duplicates.length > 0 && (
        <div className="text-red-500 mt-3">
          Duplicate node_id: {duplicates.join(', ')}
        </div>
      )}

      {/* 🔍 PREVIEW */}
      {preview.length > 0 && (
        <div className="mt-4 overflow-auto max-h-[400px] border">

          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Changes</th>
              </tr>
            </thead>

            <tbody>
              {preview.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-t">

                  <td>{row.node_id}</td>
                  <td>{row.name}</td>

                  <td>
                    {row.type === 'insert'
                      ? <span className="text-green-500">INSERT</span>
                      : <span className="text-yellow-500">UPDATE</span>}
                  </td>

                  {/* 🔥 CHANGES */}
                  <td>
                    {row.type === 'update' && Object.keys(row.changes).length > 0 && (
                      <ul>
                        {Object.entries(row.changes).map(([k, v]) => (
                          <li key={k}>
                            <b>{k}:</b> {v.old} → <span className="text-green-500">{v.new}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* 🚀 UPLOAD */}
      {preview.length > 0 && (
        <button
          onClick={handleUpload}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Processing..." : "🚀 Confirm Upload"}
        </button>
      )}

    </div>
  );
}