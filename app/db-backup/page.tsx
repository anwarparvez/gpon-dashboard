"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BackupPage() {
  const [backups, setBackups] = useState<string[]>([]);

  const loadBackups = async () => {
    const res = await fetch("/api/db/backups");
    const data = await res.json();
    setBackups(data);
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const createBackup = async () => {
    await fetch("/api/db/backup", { method: "POST" });
    alert("✅ Backup created");
    loadBackups();
  };

  const restore = async (b: string) => {
    if (!confirm(`Restore ${b}?`)) return;

    await fetch("/api/db/restore", {
      method: "POST",
      body: JSON.stringify({ backup: b }),
    });

    alert("♻️ Restored");
  };

  return (
    <div className="p-6 space-y-4">
      <Button onClick={createBackup}>💾 Create Backup</Button>

      <div>
        {backups.map((b) => (
          <div key={b} className="flex gap-3 mt-2">
            <span>{b}</span>
            <Button onClick={() => restore(b)}>Restore</Button>
          </div>
        ))}
      </div>
    </div>
  );
}