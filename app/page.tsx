'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type NodeType = {
  _id: string;
  node_id: string;
  name: string;
  latitude: number;
  longitude: number;
  node_category: string;
  status: 'existing' | 'proposed';
};

type LinkType = {
  _id: string;
};

export default function Home() {
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then((data: NodeType[]) => setNodes(data));

    fetch('/api/links')
      .then(res => res.json())
      .then((data: LinkType[]) => setLinks(data));
  }, []);

  // 📊 Summary
  const totalNodes = nodes.length;
  const totalLinks = links.length;

  const existingNodes = nodes.filter(n => n.status === 'existing').length;
  const proposedNodes = nodes.filter(n => n.status === 'proposed').length;

  // 🔥 CATEGORY-WISE COUNT
  const categoryStats = {};

  nodes.forEach(node => {
    const cat = node.node_category;

    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        existing: 0,
        proposed: 0,
        total: 0
      };
    }

    categoryStats[cat].total++;

    if (node.status === 'existing') {
      categoryStats[cat].existing++;
    } else {
      categoryStats[cat].proposed++;
    }
  });

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">

      <h1 className="text-2xl font-bold mb-6 text-center">
        GPON Planning Dashboard
      </h1>

      {/* 📊 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-blue-600 text-white p-5 rounded shadow">
          <h3>Total Nodes</h3>
          <p className="text-3xl font-bold">{totalNodes}</p>
        </div>

        <div className="bg-green-600 text-white p-5 rounded shadow">
          <h3>Total Links</h3>
          <p className="text-3xl font-bold">{totalLinks}</p>
        </div>

        <div className="bg-purple-600 text-white p-5 rounded shadow">
          <h3>Existing Nodes</h3>
          <p className="text-3xl font-bold">{existingNodes}</p>
        </div>

      </div>

      {/* 📊 Proposed Count */}
      <div className="mb-6">
        <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded">
          <h4 className="font-bold mb-2">Proposed Nodes</h4>
          <p className="text-xl">{proposedNodes}</p>
        </div>
      </div>

      {/* 🔥 CATEGORY TABLE */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">📊 Node Category Summary</h2>

        <table className="w-full border text-sm">
          <thead className="bg-gray-200 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-center">Existing</th>
              <th className="p-2 text-center">Proposed</th>
              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(categoryStats).map(([cat, val]: any) => (
              <tr key={cat} className="border-t">
                <td className="p-2 font-medium">{cat}</td>
                <td className="p-2 text-center text-green-600">{val.existing}</td>
                <td className="p-2 text-center text-orange-500">{val.proposed}</td>
                <td className="p-2 text-center font-bold">{val.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚀 Navigation */}
      <div className="flex gap-4 justify-center">

        <Link href="/map">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded">
            🗺 Open Map
          </button>
        </Link>

        <Link href="/nodes">
          <button className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded">
            📋 Node Table
          </button>
        </Link>

      </div>

    </div>
  );
}