'use client';

import LinkTable from '../../components/LinkTable';

export default function LinksPage() {
  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">

      {/* PAGE HEADER */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🔗 Link Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage fiber connections between nodes
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <LinkTable />
      </div>

    </div>
  );
}