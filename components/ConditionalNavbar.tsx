'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const { status } = useSession();

  // Hide navbar on public routes
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register';
  
  // Don't render anything while checking session
  if (status === 'loading') return null;
  
  // Hide navbar on public routes or when not authenticated
  if (isPublicRoute || status !== 'authenticated') return null;
  
  return <Navbar />;
}