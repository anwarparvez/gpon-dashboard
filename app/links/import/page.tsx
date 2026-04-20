'use client';

import { useState } from 'react';

export default function ImportLinks() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (!file) return alert('Select file');

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'preview');

    const res = await fetch('/api/import-links', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    setPreview(data.preview);
    setSummary(data.summary);
    setLoading(false);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'import');

    const res = await fetch('/api/import-links', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    alert(`✅ Imported: ${data.summary.inserted}`);
    setLoading(false);
  };

  return (
    <div className="p-6">

      <h1 className="text-xl font-bold mb-4">📥 Import Links</h1>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <div className="flex gap-2 my-4">
        <button onClick={handlePreview} className="bg-blue-600 text-white px-3 py-2 rounded">
          👀 Preview
        </button>

        <button onClick={handleImport} className="bg-green-600 text-white px-3 py-2 rounded">
          ✅ Confirm Import
        </button>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="mb-4">
          <p>Total: {summary.total}</p>
          <p className="text-green-600">Valid: {summary.valid}</p>
          <p className="text-red-600">Invalid: {summary.invalid}</p>
        </div>
      )}

      {/* PREVIEW TABLE */}
      {preview.length > 0 && (
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Core</th>
              <th>Used</th>
              <th>Status</th>
              <th>Check</th>
            </tr>
          </thead>

          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className={row.status_check === 'ok' ? '' : 'bg-red-100'}>
                <td>{row.from_node}</td>
                <td>{row.to_node}</td>
                <td>{row.fiber_core}</td>
                <td>{row.used_core}</td>
                <td>{row.status}</td>

                <td>
                  {row.status_check === 'ok'
                    ? '✅'
                    : `❌ ${row.error}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
}