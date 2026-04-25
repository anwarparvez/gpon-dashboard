'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

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

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user?.name) return 'U';
    return session.user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Don't render navbar while checking session or if not authenticated
  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        {/* 🧭 LEFT */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/home">
            <h3 className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors">
              GPON
            </h3>
          </Link>

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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm">
                  {session.user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email}
                  </p>
                  {session.user?.role && (
                    <p className="text-xs leading-none text-muted-foreground mt-1 capitalize">
                      Role: {session.user.role}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}