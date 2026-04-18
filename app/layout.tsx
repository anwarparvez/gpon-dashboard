import './globals.css';
import Navbar from './components/Navbar';
import { ReactNode } from 'react';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'GPON Dashboard',
  description: 'GPON Planning System',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        suppressHydrationWarning   // 🔥 FIX
        style={{ margin: 0 }}
      >

        {/* 🔹 Global Navbar */}
        <Navbar />

        {/* 🔹 Page Content */}
        <div style={{ padding: '10px' }}>
          {children}
        </div>

      </body>
    </html>
  );
}