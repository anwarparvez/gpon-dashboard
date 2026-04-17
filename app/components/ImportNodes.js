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

        // 🔁 Remove duplicate coordinates (within CSV)
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

      alert(`✅ Inserted: ${result.inserted}\n⚠ Skipped: ${result.skipped}`);

      console.log(result);

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div>

      <h3>📂 Import GPON Nodes</h3>

      <input type="file" accept=".csv" onChange={handleFile} />
      <p>{fileName}</p>

      {/* ✅ VALID DATA */}
      {data.length > 0 && (
        <>
          <h4>✅ Valid Data ({data.length})</h4>

          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Category</th>
              </tr>
            </thead>

            <tbody>
              {data.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  <td>{row.name}</td>
                  <td>{row.latitude}</td>
                  <td>{row.longitude}</td>
                  <td>{row.node_category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ❌ INVALID DATA */}
      {errors.length > 0 && (
        <>
          <h4 style={{ color: 'red' }}>
            ❌ Invalid Rows ({errors.length})
          </h4>

          <ul>
            {errors.slice(0, 10).map((row, i) => (
              <li key={i}>
                Row {row.row} → Missing/Invalid data
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 🔁 DUPLICATES */}
      {duplicates.length > 0 && (
        <>
          <h4 style={{ color: 'orange' }}>
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

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "🚀 Import to Database"}
      </button>

    </div>
  );
}