'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on landing page (/) and auth pages
  const hideNavbar = pathname === '/' || pathname === '/login' || pathname === '/register';
  
  if (hideNavbar) return null;
  return <Navbar />;
}