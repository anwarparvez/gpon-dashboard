type Node = {
  _id: string;
  node_id: string;
  latitude: number;
  longitude: number;
  node_category: string;
};

// average helper
function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// find nearest node (simple euclidean)
export function nearestNode(
  target: { lat: number; lng: number },
  nodes: Node[]
) {
  let min = Infinity;
  let best: Node | null = null;

  nodes.forEach(n => {
    const d =
      (n.latitude - target.lat) ** 2 +
      (n.longitude - target.lng) ** 2;

    if (d < min) {
      min = d;
      best = n;
    }
  });

  return best;
}

// 🔥 Suggest ODP based on HODP density
export function suggestODP(nodes: Node[]) {
  const hodps = nodes.filter(n => n.node_category === 'HODP');

  if (hodps.length < 6) return [];

  const lat = avg(hodps.map(h => h.latitude));
  const lng = avg(hodps.map(h => h.longitude));

  return [
    {
      type: 'ODP',
      reason: `High HODP density (${hodps.length})`,
      location: { lat, lng }
    }
  ];
}