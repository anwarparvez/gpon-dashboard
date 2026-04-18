'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
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

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
    >
      {dark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}