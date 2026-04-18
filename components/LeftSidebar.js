'use client';

import { useState, useEffect } from 'react';

export default function LeftSidebar({ mode, setMode, setSidebarWidth }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSidebarWidth(collapsed ? 60 : 200);
  }, [collapsed]);

  const menu = [
    { key: 'add-node', label: 'Add Node', icon: '➕' },
    { key: 'link', label: 'Add Link', icon: '🔗' }
  ];

  return (
    <div
      className={`fixed top-[60px] left-0 h-[calc(100%-60px)] bg-gray-900 text-white z-[1000] transition-all duration-300
      ${collapsed ? 'w-[60px]' : 'w-[200px]'}`}
    >
      {/* Toggle */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 cursor-pointer"
      >
        ☰
      </div>

      {/* Menu */}
      {menu.map(item => (
        <div
          key={item.key}
          title={collapsed ? item.label : ''}
          onClick={() => setMode(item.key)}
          className={`flex items-center gap-3 p-3 m-2 rounded cursor-pointer hover:bg-gray-700
          ${mode === item.key ? 'bg-blue-700' : ''}`}
        >
          <span>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </div>
      ))}
    </div>
  );
}