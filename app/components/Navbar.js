'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        background: '#0b3d91',
        color: 'white'
      }}
    >
      {/* Logo / Title */}
      <h3 style={{ margin: 0 }}>GPON Dashboard</h3>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <Link href="/" style={{ color: 'white' }}>
          Map
        </Link>

        <Link href="/add-node" style={{ color: 'white' }}>
          Add Node
        </Link>

        <Link href="/nodes" style={{ color: 'white' }}>
          Node Table
        </Link>
      </div>
    </div>
  );
}