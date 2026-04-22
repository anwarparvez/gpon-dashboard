'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import ThemeToggle from './ThemeToggle';

import {
  Home,
  Map,
  Table,
  Upload,
  Layers
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  const NavLink = ({
    href,
    icon: Icon,
    label
  }: {
    href: string;
    icon: any;
    label: string;
  }) => (
    <Link href={href}>
      <Button
        variant={isActive(href) ? 'default' : 'ghost'}
        size="sm"
        className="flex items-center gap-2"
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">

      <div className="flex h-14 items-center justify-between px-6">

        {/* 🧭 LEFT */}
        <div className="flex items-center gap-4">

          <h3 className="font-semibold text-lg">
            GPON Dashboard
          </h3>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">

            <NavLink href="/" icon={Home} label="Home" />
            <NavLink href="/map" icon={Map} label="Map" />
            <NavLink href="/nodes" icon={Table} label="Nodes" />
            <NavLink href="/zones" icon={Layers} label="Zones" />
            <NavLink href="/import" icon={Upload} label="Import" />

          </div>
        </div>

        {/* 🌙 RIGHT */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>

      </div>

    </header>
  );
}