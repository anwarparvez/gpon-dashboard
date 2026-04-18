import ImportNodes from '../../components/ImportNodes';

export default function ImportPage() {
  return (
    <main style={{ padding: '20px' }}>
      <h2>📂 Import GPON Nodes</h2>

      <p style={{ color: '#555' }}>
        Upload CSV file with columns: <b>name, latitude, longitude, node_category</b>
      </p>

      <ImportNodes />
    </main>
  );
}