import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

type BackupTarget = "db" | "uploads" | "all";
type RestoreTarget = "db" | "uploads";
type BackupKind = "db" | "uploads";

interface BackupResult {
  kind: BackupKind;
  filePath: string;
  metadataPath: string;
}

interface BackupMetadata {
  kind: BackupKind;
  createdAt: string;
  hostname: string;
  filePath: string;
  sizeBytes: number;
  retentionDays: number;
  sourcePath?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(projectRoot, ".env") });

function printUsage(): void {
  console.log(`Usage:
  npx tsx src/scripts/backupManager.ts backup <db|uploads|all>
  npx tsx src/scripts/backupManager.ts restore <db|uploads> --file <path> --yes

Environment variables:
  DATABASE_URL             required for db backup/restore
  UPLOADS_PATH             optional, defaults to data/uploads
  BACKUP_ROOT              optional, defaults to data/backups
  BACKUP_RETENTION_DAYS    optional, defaults to 14`);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveProjectPath(value: string | undefined, fallbackSegments: string[]): string {
  if (!value || value.trim().length === 0) {
    return path.join(projectRoot, ...fallbackSegments);
  }
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

function getBackupRoot(): string {
  return resolveProjectPath(process.env.BACKUP_ROOT, ["data", "backups"]);
}

function getUploadsPath(): string {
  return resolveProjectPath(process.env.UPLOADS_PATH, ["data", "uploads"]);
}

function getRetentionDays(): number {
  const raw = process.env.BACKUP_RETENTION_DAYS?.trim();
  if (!raw) return 14;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("BACKUP_RETENTION_DAYS must be a positive integer.");
  }

  return parsed;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function ensureExists(filePath: string, label: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureCommandAvailable(command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });

    child.on("error", () => {
      reject(new Error(`Required command is not available: ${command}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Required command is not available: ${command}`));
    });
  });
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function writeMetadata(kind: BackupKind, filePath: string, retentionDays: number, sourcePath?: string): Promise<string> {
  const stats = await fs.stat(filePath);
  const metadata: BackupMetadata = {
    kind,
    createdAt: new Date().toISOString(),
    hostname: os.hostname(),
    filePath,
    sizeBytes: stats.size,
    retentionDays,
    ...(sourcePath ? { sourcePath } : {}),
  };

  const metadataPath = `${filePath}.json`;
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadataPath;
}

async function pruneOldBackups(dirPath: string, retentionDays: number): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) return;

    const targetPath = path.join(dirPath, entry.name);
    const stats = await fs.stat(targetPath);
    if (stats.mtimeMs < cutoff) {
      await fs.rm(targetPath, { force: true });
    }
  }));
}

async function backupDatabase(): Promise<BackupResult> {
  await ensureCommandAvailable("pg_dump");

  const databaseUrl = getRequiredEnv("DATABASE_URL");
  const retentionDays = getRetentionDays();
  const backupDir = path.join(getBackupRoot(), "db");
  const filePath = path.join(backupDir, `db_${getTimestamp()}.dump`);

  await ensureDirectory(backupDir);
  await runCommand("pg_dump", [
    "--dbname",
    databaseUrl,
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "--file",
    filePath,
  ]);

  const metadataPath = await writeMetadata("db", filePath, retentionDays);
  await pruneOldBackups(backupDir, retentionDays);

  console.log(`Database backup created: ${filePath}`);
  return { kind: "db", filePath, metadataPath };
}

async function backupUploads(): Promise<BackupResult> {
  await ensureCommandAvailable("tar");

  const uploadsPath = getUploadsPath();
  const retentionDays = getRetentionDays();
  const backupDir = path.join(getBackupRoot(), "uploads");
  const filePath = path.join(backupDir, `uploads_${getTimestamp()}.tar.gz`);

  await ensureExists(uploadsPath, "Uploads path");
  await ensureDirectory(backupDir);
  await runCommand("tar", [
    "-czf",
    filePath,
    "-C",
    path.dirname(uploadsPath),
    path.basename(uploadsPath),
  ]);

  const metadataPath = await writeMetadata("uploads", filePath, retentionDays, uploadsPath);
  await pruneOldBackups(backupDir, retentionDays);

  console.log(`Uploads backup created: ${filePath}`);
  return { kind: "uploads", filePath, metadataPath };
}

async function backupTarget(target: BackupTarget): Promise<void> {
  if (target === "db") {
    await backupDatabase();
    return;
  }

  if (target === "uploads") {
    await backupUploads();
    return;
  }

  const results = await Promise.all([backupDatabase(), backupUploads()]);
  console.log("Backup completed:");
  results.forEach((result) => {
    console.log(`- ${result.kind}: ${result.filePath}`);
  });
}

async function restoreDatabase(archivePath: string, yes: boolean): Promise<void> {
  if (!yes) {
    throw new Error("Database restore is destructive. Re-run with --yes.");
  }

  await ensureCommandAvailable("pg_restore");
  await ensureExists(archivePath, "Database backup file");

  const databaseUrl = getRequiredEnv("DATABASE_URL");
  await runCommand("pg_restore", [
    "--dbname",
    databaseUrl,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--single-transaction",
    archivePath,
  ]);

  console.log(`Database restore completed from: ${archivePath}`);
}

async function restoreUploads(archivePath: string, yes: boolean): Promise<void> {
  if (!yes) {
    throw new Error("Uploads restore overwrites the live uploads directory. Re-run with --yes.");
  }

  await ensureCommandAvailable("tar");
  await ensureExists(archivePath, "Uploads backup file");

  const uploadsPath = getUploadsPath();
  const uploadsParent = path.dirname(uploadsPath);
  const uploadsName = path.basename(uploadsPath);
  const tempExtractRoot = path.join(uploadsParent, `.uploads-restore-${Date.now()}`);
  const extractedUploadsPath = path.join(tempExtractRoot, uploadsName);
  const previousUploadsPath = path.join(uploadsParent, `${uploadsName}.before-restore-${getTimestamp()}`);

  await ensureDirectory(tempExtractRoot);
  await runCommand("tar", ["-xzf", archivePath, "-C", tempExtractRoot]);
  await ensureExists(extractedUploadsPath, "Extracted uploads directory");

  try {
    await fs.access(uploadsPath);
    await fs.rename(uploadsPath, previousUploadsPath);
    console.log(`Current uploads moved to: ${previousUploadsPath}`);
  } catch {
    await ensureDirectory(uploadsParent);
  }

  await fs.rename(extractedUploadsPath, uploadsPath);
  await fs.rm(tempExtractRoot, { recursive: true, force: true });

  console.log(`Uploads restore completed from: ${archivePath}`);
}

async function restoreTarget(target: RestoreTarget, archivePath: string | undefined, yes: boolean): Promise<void> {
  if (!archivePath) {
    throw new Error("Missing --file <path> for restore command.");
  }

  const resolvedArchivePath = path.isAbsolute(archivePath)
    ? archivePath
    : path.resolve(projectRoot, archivePath);

  if (target === "db") {
    await restoreDatabase(resolvedArchivePath, yes);
    return;
  }

  await restoreUploads(resolvedArchivePath, yes);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  if (command === "backup") {
    const target = args[1] as BackupTarget | undefined;
    if (!target || !["db", "uploads", "all"].includes(target)) {
      throw new Error("Backup target must be one of: db, uploads, all.");
    }

    await backupTarget(target);
    return;
  }

  if (command === "restore") {
    const target = args[1] as RestoreTarget | undefined;
    if (!target || !["db", "uploads"].includes(target)) {
      throw new Error("Restore target must be one of: db, uploads.");
    }

    const filePath = getFlagValue(args, "--file");
    const yes = args.includes("--yes");
    await restoreTarget(target, filePath, yes);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});