import fs from "fs";
import path from "path";

export async function GET() {
  const backupDir = path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    return Response.json([]);
  }

  const backups = fs.readdirSync(backupDir);

  return Response.json(backups.reverse());
}