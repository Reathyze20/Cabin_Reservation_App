/**
 * Simple file-based logger with remote access via admin API.
 * Logs are stored in /data/logs/ directory with daily rotation.
 */

import fs from "fs";
import path from "path";

const logsDir = path.join(__dirname, "../../data/logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function getTimestamp(): string {
  return new Date().toISOString();
}

function getLogFilePath(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(logsDir, `${date}.log`);
}

function writeLog(level: LogLevel, category: string, message: string, data?: any): void {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
  const line = `[${timestamp}] [${level}] [${category}] ${message}${dataStr}\n`;

  // Write to file
  try {
    fs.appendFileSync(getLogFilePath(), line);
  } catch (err) {
    console.error("Logger write error:", err);
  }

  // Also output to console
  const consoleMethod = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  consoleMethod(`[${level}] [${category}] ${message}`, data || "");
}

const logger = {
  info: (category: string, message: string, data?: any) =>
    writeLog("INFO", category, message, data),

  warn: (category: string, message: string, data?: any) =>
    writeLog("WARN", category, message, data),

  error: (category: string, message: string, data?: any) =>
    writeLog("ERROR", category, message, data),

  debug: (category: string, message: string, data?: any) =>
    writeLog("DEBUG", category, message, data),

  /**
   * Read log entries. Returns last N lines from today (or a specific date).
   */
  readLogs(options?: { date?: string; lines?: number; level?: LogLevel }): string[] {
    const date = options?.date || new Date().toISOString().split("T")[0];
    const maxLines = options?.lines || 200;
    const filePath = path.join(logsDir, `${date}.log`);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      let lines = content.split("\n").filter((l) => l.trim());

      // Filter by level if specified
      if (options?.level) {
        lines = lines.filter((l) => l.includes(`[${options.level}]`));
      }

      // Return last N lines
      return lines.slice(-maxLines);
    } catch {
      return [];
    }
  },

  /**
   * List available log files (dates).
   */
  listLogFiles(): string[] {
    try {
      return fs
        .readdirSync(logsDir)
        .filter((f) => f.endsWith(".log"))
        .map((f) => f.replace(".log", ""))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  },
};

export default logger;
