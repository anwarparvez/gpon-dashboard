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
  Layers,
  Link as LinkIcon,
  Database,
  Wrench,
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
        <span className="hidden lg:inline">{label}</span>
      </Button>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        {/* 🧭 LEFT */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-lg">
            GPON
          </h3>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1 flex-wrap">
            <NavLink href="/home" icon={Home} label="Home" />
            <NavLink href="/map" icon={Map} label="Map" />
            <NavLink href="/nodes" icon={Table} label="Nodes" />
            <NavLink href="/links" icon={LinkIcon} label="Links" />
            <NavLink href="/zones" icon={Layers} label="Zones" />
            <NavLink href="/import" icon={Upload} label="Import" />
            <NavLink href="/tools/nearest-odp" icon={Wrench} label="Tools" />
            <NavLink href="/migrate" icon={Database} label="Migrate" />
            <NavLink href="/db-backup" icon={Database} label="Backup" />
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