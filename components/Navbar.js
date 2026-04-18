'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (path) =>
    `hover:opacity-80 ${
      pathname === path
        ? 'font-bold border-b-2 border-white'
        : ''
    }`;

  return (
    <div className="flex justify-between items-center px-5 py-3 bg-blue-900 text-white">

      {/* Logo */}
      <h3 className="m-0 font-semibold">
        GPON Dashboard
      </h3>

      {/* Navigation */}
      <div className="flex items-center gap-6">

        <Link href="/" className={linkClass('/')}>
          Home
        </Link>

        <Link href="/map" className={linkClass('/map')}>
          Map
        </Link>

        <Link href="/nodes" className={linkClass('/nodes')}>
          Node Table
        </Link>

        <Link href="/import" className={linkClass('/import')}>
          Import
        </Link>

        {/* 🌙 Theme Toggle */}
        <ThemeToggle />

      </div>
    </div>
  );
}