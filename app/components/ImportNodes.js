'use client';

import { useState } from 'react';
import Papa from 'papaparse';

export default function ImportNodes() {
  const [data, setData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // 📂 Handle file upload
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        const cleaned = results.data.map((row, index) => {
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);

          return {
            name: row.name?.trim(),
            latitude: lat,
            longitude: lon,
            node_category: row.node_category || 'HODP',

            // 🆕 NEW FIELDS
            status: row.status || 'proposed',
            dgm: row.dgm || '',
            region: row.region || '',

            row: index + 1
          };
        });

        // ❌ Invalid rows
        const invalid = cleaned.filter(r =>
          !r.name || isNaN(r.latitude) || isNaN(r.longitude)
        );

        // ✅ Valid rows
        const valid = cleaned.filter(r =>
          r.name && !isNaN(r.latitude) && !isNaN(r.longitude)
        );

        // 🔁 Remove duplicate coordinates
        const seen = new Set();
        const unique = [];
        const dup = [];

        valid.forEach(item => {
          const key = `${item.latitude}-${item.longitude}`;

          if (seen.has(key)) {
            dup.push(item);
          } else {
            seen.add(key);
            unique.push(item);
          }
        });

        setData(unique);
        setErrors(invalid);
        setDuplicates(dup);
      },

      error: (err) => {
        console.error(err);
        alert("CSV parsing failed");
      }
    });
  };

  // 💾 Upload to DB
  const handleUpload = async () => {
    if (data.length === 0) {
      alert("No valid data to upload");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, data })
      });

      const result = await res.json();

      if (result.error) {
        alert("❌ " + result.error);
        return;
      }

      alert(`✅ Inserted: ${result.inserted}\n⚠ Skipped: ${result.skipped}`);

      console.log("Import Result:", result);

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded">

      <h3 className="text-lg font-bold mb-3">📂 Import GPON Nodes</h3>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="mb-2"
      />

      <p className="text-gray-400">{fileName}</p>

      {/* ✅ VALID DATA */}
      {data.length > 0 && (
        <>
          <h4 className="text-green-400 mt-4">
            ✅ Valid Data ({data.length})
          </h4>

          <div className="overflow-auto">
            <table className="w-full text-sm border border-gray-700 mt-2">
              <thead className="bg-gray-700">
                <tr>
                  <th>Name</th>
                  <th>Lat</th>
                  <th>Lon</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>DGM</th>
                  <th>Region</th>
                </tr>
              </thead>

              <tbody>
                {data.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    <td>{row.name}</td>
                    <td>{row.latitude}</td>
                    <td>{row.longitude}</td>
                    <td>{row.node_category}</td>
                    <td className={row.status === 'existing' ? 'text-green-400' : 'text-yellow-400'}>
                      {row.status}
                    </td>
                    <td>{row.dgm}</td>
                    <td>{row.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ❌ INVALID */}
      {errors.length > 0 && (
        <>
          <h4 className="text-red-400 mt-4">
            ❌ Invalid Rows ({errors.length})
          </h4>

          <ul>
            {errors.slice(0, 10).map((row, i) => (
              <li key={i}>
                Row {row.row} → Invalid
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 🔁 DUPLICATES */}
      {duplicates.length > 0 && (
        <>
          <h4 className="text-orange-400 mt-4">
            🔁 Duplicate Coordinates ({duplicates.length})
          </h4>

          <ul>
            {duplicates.slice(0, 10).map((row, i) => (
              <li key={i}>
                Row {row.row} → {row.name}
              </li>
            ))}
          </ul>
        </>
      )}

      <br />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 px-4 py-2 rounded mt-2"
      >
        {loading ? "Uploading..." : "🚀 Import to Database"}
      </button>

    </div>
  );
}