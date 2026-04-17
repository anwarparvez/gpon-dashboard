'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ✅ Define types
type NodeType = {
  _id: string;
  node_id: string;
  name: string;
  latitude: number;
  longitude: number;
  node_category: string;
  status: 'existing' | 'proposed';
  dgm?: string;
  region?: string;
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

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">

      <h1 className="text-2xl font-bold mb-6 text-center">
        GPON Planning Dashboard
      </h1>

      {/* 📊 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-blue-600 text-white p-5 rounded shadow">
          <h3 className="text-lg">Total Nodes</h3>
          <p className="text-3xl font-bold">{totalNodes}</p>
        </div>

        <div className="bg-green-600 text-white p-5 rounded shadow">
          <h3 className="text-lg">Total Links</h3>
          <p className="text-3xl font-bold">{totalLinks}</p>
        </div>

        <div className="bg-purple-600 text-white p-5 rounded shadow">
          <h3 className="text-lg">Existing Nodes</h3>
          <p className="text-3xl font-bold">{existingNodes}</p>
        </div>

      </div>

      {/* 📊 Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded">
          <h4 className="font-bold mb-2">Proposed Nodes</h4>
          <p className="text-xl">{proposedNodes}</p>
        </div>

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