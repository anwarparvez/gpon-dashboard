import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    const backupDir = path.join(process.cwd(), "backups", timestamp);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const uri = process.env.MONGODB_URI; // 🔥 use env

    const command = `mongodump --uri="${uri}" --out="${backupDir}"`;

    await execAsync(command);

    return Response.json({
      success: true,
      message: "Backup created",
      backup: timestamp,
    });

  } catch (error: any) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}