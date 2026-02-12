import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import logger from "../../utils/logger";

const router = Router();

/**
 * GET /api/logs
 * Admin-only: Read server logs remotely.
 * Query params:
 *   ?date=YYYY-MM-DD  (default: today)
 *   ?lines=100        (default: 200)
 *   ?level=ERROR       (optional filter: INFO, WARN, ERROR, DEBUG)
 */
router.get("/", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Pouze pro adminy." });
  }

  const { date, lines, level } = req.query;

  const logLines = logger.readLogs({
    date: date as string | undefined,
    lines: lines ? parseInt(lines as string, 10) : 200,
    level: level as "INFO" | "WARN" | "ERROR" | "DEBUG" | undefined,
  });

  res.json({
    date: date || new Date().toISOString().split("T")[0],
    count: logLines.length,
    logs: logLines,
  });
});

/**
 * GET /api/logs/files
 * Admin-only: List available log file dates.
 */
router.get("/files", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Pouze pro adminy." });
  }

  const files = logger.listLogFiles();
  res.json({ files });
});

export default router;
