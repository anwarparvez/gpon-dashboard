'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  // 🔥 prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const newMode = !dark;

    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');

    setDark(newMode);
  };

  // 🚫 avoid SSR mismatch
  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title="Toggle Theme"
    >
      {dark ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </Button>
  );
}