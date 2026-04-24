import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { backup } = await req.json();

    if (!backup) {
      return Response.json(
        { error: "Backup name required" },
        { status: 400 }
      );
    }

    const backupPath = path.join(process.cwd(), "backups", backup);

    if (!fs.existsSync(backupPath)) {
      return Response.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    const uri = process.env.MONGODB_URI;

    // ⚠️ Drop existing data before restore
    const command = `mongorestore --uri="${uri}" --drop "${backupPath}"`;

    await execAsync(command);

    return Response.json({
      success: true,
      message: "Database restored",
      backup,
    });

  } catch (error: any) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}