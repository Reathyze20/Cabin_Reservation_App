import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const keepArtifacts = process.argv.includes("--keep-artifacts");
const smokeId = Date.now().toString();
const containerName = `cabin-backup-smoke-${smokeId}`;
const workDir = path.join(os.tmpdir(), `cabin-backup-smoke-${smokeId}`);
const backupRoot = path.join(workDir, "backups");
const uploadsSourcePath = path.join(workDir, "uploads-live");
const uploadsRestorePath = path.join(workDir, "uploads-restored", path.basename(uploadsSourcePath));
const liveDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/smoke_live";
const restoredDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/smoke_restore";

async function runCommand(command: string, args: string[], options: RunOptions = {}): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}\n${stderr}`.trim()));
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

async function waitForPostgres(): Promise<void> {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await runCommand("docker", [
        "exec",
        "-i",
        containerName,
        "psql",
        "-U",
        "postgres",
        "-d",
        "smoke_live",
        "-tA",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "SELECT 1;",
      ]);
      return;
    } catch (error) {
      if (attempt === 20) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

async function seedLiveDatabase(): Promise<void> {
  const sql = [
    "CREATE TABLE smoke_items (id serial PRIMARY KEY, name text NOT NULL);",
    "INSERT INTO smoke_items (name) VALUES ('rucniky'), ('drevo'), ('sirky');",
    "CREATE TABLE smoke_meta (key text PRIMARY KEY, value text NOT NULL);",
    "INSERT INTO smoke_meta (key, value) VALUES ('season', '2026'), ('owner', 'family-ready');",
  ].join(" ");

  await runCommand("docker", [
    "exec",
    "-i",
    containerName,
    "psql",
    "-U",
    "postgres",
    "-d",
    "smoke_live",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
}

async function recreateRestoreDatabase(): Promise<void> {
  await runCommand("docker", ["exec", "-i", containerName, "dropdb", "--if-exists", "-U", "postgres", "smoke_restore"]);
  await runCommand("docker", ["exec", "-i", containerName, "createdb", "-U", "postgres", "smoke_restore"]);
}

async function createUploadsFixture(): Promise<void> {
  await fs.mkdir(path.join(uploadsSourcePath, "thumbs"), { recursive: true });
  await fs.mkdir(path.join(uploadsSourcePath, "wallpapers"), { recursive: true });

  await fs.writeFile(path.join(uploadsSourcePath, "gallery-photo.txt"), "family-ready smoke fixture\n", "utf8");
  await fs.writeFile(path.join(uploadsSourcePath, "thumbs", "gallery-photo-thumb.txt"), "thumb fixture\n", "utf8");
  await fs.writeFile(path.join(uploadsSourcePath, "wallpapers", "cabin-wallpaper.txt"), "wallpaper fixture\n", "utf8");
}

async function runBackupManager(args: string[], envOverrides: NodeJS.ProcessEnv): Promise<void> {
  const env = {
    ...process.env,
    ...envOverrides,
  };

  const result = await runCommand(process.execPath, ["--import", "tsx", "src/scripts/backupManager.ts", ...args], {
    cwd: projectRoot,
    env,
  });

  if (result.stdout.trim().length > 0) {
    console.log(result.stdout.trim());
  }
}

async function getLatestFile(dirPath: string, suffix: string): Promise<string> {
  const entries = await fs.readdir(dirPath);
  const matching = entries.filter((entry) => entry.endsWith(suffix)).sort();
  const latest = matching.at(-1);

  if (!latest) {
    throw new Error(`Missing expected backup artifact in ${dirPath}`);
  }

  return path.join(dirPath, latest);
}

async function queryDatabase(databaseName: string, sql: string): Promise<string> {
  const result = await runCommand("docker", [
    "exec",
    "-i",
    containerName,
    "psql",
    "-U",
    "postgres",
    "-d",
    databaseName,
    "-tA",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);

  return result.stdout.trim();
}

async function collectFiles(rootPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function walk(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        return;
      }

      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
      const content = await fs.readFile(fullPath, "utf8");
      files.set(relativePath, content);
    }));
  }

  await walk(rootPath);
  return files;
}

async function assertUploadsRestored(): Promise<void> {
  const original = await collectFiles(uploadsSourcePath);
  const restored = await collectFiles(uploadsRestorePath);

  if (original.size !== restored.size) {
    throw new Error(`Uploads restore mismatch: expected ${original.size} files, got ${restored.size}.`);
  }

  for (const [relativePath, content] of original.entries()) {
    if (!restored.has(relativePath)) {
      throw new Error(`Uploads restore is missing file: ${relativePath}`);
    }

    if (restored.get(relativePath) !== content) {
      throw new Error(`Uploads restore content mismatch for file: ${relativePath}`);
    }
  }
}

async function cleanup(): Promise<void> {
  try {
    await runCommand("docker", ["stop", containerName]);
  } catch {
    // Best effort cleanup.
  }

  if (!keepArtifacts) {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(backupRoot, { recursive: true });
  await createUploadsFixture();

  console.log("=== Starting disposable PostgreSQL container ===");
  await runCommand("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-e",
    "POSTGRES_DB=smoke_live",
    "postgres:16-alpine",
  ]);

  await waitForPostgres();
  await seedLiveDatabase();

  const pgDumpCommand = JSON.stringify(["docker", "exec", "-i", containerName, "pg_dump"]);
  const pgRestoreCommand = JSON.stringify(["docker", "exec", "-i", containerName, "pg_restore"]);

  console.log("=== Running backup:all via backupManager ===");
  await runBackupManager(["backup", "all"], {
    DATABASE_URL: liveDatabaseUrl,
    UPLOADS_PATH: uploadsSourcePath,
    BACKUP_ROOT: backupRoot,
    BACKUP_RETENTION_DAYS: "14",
    PG_DUMP_COMMAND: pgDumpCommand,
  });

  const dbBackupFile = await getLatestFile(path.join(backupRoot, "db"), ".dump");
  const uploadsBackupFile = await getLatestFile(path.join(backupRoot, "uploads"), ".tar.gz");

  console.log("=== Restoring DB backup into smoke_restore ===");
  await recreateRestoreDatabase();
  await runBackupManager(["restore", "db", "--file", dbBackupFile, "--yes"], {
    DATABASE_URL: restoredDatabaseUrl,
    PG_RESTORE_COMMAND: pgRestoreCommand,
  });

  const liveItems = await queryDatabase("smoke_live", "SELECT string_agg(name, ',' ORDER BY id) FROM smoke_items;");
  const restoredItems = await queryDatabase("smoke_restore", "SELECT string_agg(name, ',' ORDER BY id) FROM smoke_items;");
  if (liveItems !== restoredItems) {
    throw new Error(`DB restore mismatch: expected '${liveItems}', got '${restoredItems}'.`);
  }

  const restoredMetaCount = await queryDatabase("smoke_restore", "SELECT COUNT(*) FROM smoke_meta;");
  if (restoredMetaCount !== "2") {
    throw new Error(`DB restore mismatch: expected 2 smoke_meta rows, got ${restoredMetaCount}.`);
  }

  console.log("=== Restoring uploads backup into temp directory ===");
  await runBackupManager(["restore", "uploads", "--file", uploadsBackupFile, "--yes"], {
    UPLOADS_PATH: uploadsRestorePath,
  });
  await assertUploadsRestored();

  console.log("Backup and restore smoke test passed.");
  console.log(`Artifacts: ${keepArtifacts ? workDir : "cleaned up"}`);
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    await cleanup();
  })
  .finally(async () => {
    await cleanup();
  });