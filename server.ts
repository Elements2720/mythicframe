import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { beiBridge } from "./src/server/beiBridge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("assets.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT,
    prompt TEXT,
    type TEXT,
    imageUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  // Start BEI Bridge on unique port (58925)
  try {
    await beiBridge.start();
  } catch (err) {
    console.warn("Could not start BEI Bridge server:", err);
  }

  const app = express();
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.argv[2];
  const PORT = parseInt(portFromArg || process.env.PORT || "3488", 10);

  app.use(express.json({ limit: '50mb' }));

  // BEI API Proxy Endpoints on main web server (port 3488)
  app.get("/api/bei/status", (req, res) => {
    res.json(beiBridge.getStatus());
  });

  app.get("/api/bei/config", (req, res) => {
    const status = beiBridge.getStatus();
    res.json({ projectDir: status.projectDir, port: status.port });
  });

  app.post("/api/bei/config", (req, res) => {
    const { projectDir } = req.body;
    if (projectDir) {
      (beiBridge as any).projectDir = projectDir;
    }
    res.json({ success: true, projectDir: (beiBridge as any).projectDir });
  });

  app.post("/api/bei/open-tab", (req, res) => {
    const { target = "gemini", accountSlot = 0, tabMode, bringTabToFront } = req.body;
    if (beiBridge.isConnected()) {
      (beiBridge as any).extensionSocket?.send(JSON.stringify({
        type: "OPEN_TAB",
        data: { target, accountSlot, tabMode, bringTabToFront }
      }));
      res.json({ success: true, opened: true });
    } else {
      res.status(503).json({ error: "BEI Extension not connected" });
    }
  });

  app.get("/api/bei/events", (req, res) => {
    beiBridge.handleEventsRequest(req, res);
  });

  app.get("/api/bei/progress", (req, res) => {
    const jobId = req.query.jobId as string | undefined;
    const progress = jobId ? beiBridge.latestProgress[jobId] : beiBridge.globalProgress;
    res.json({ success: true, progress });
  });

  app.get("/api/bei/payloads", (req, res) => {
    const jobId = req.query.jobId as string | undefined;
    if (jobId) {
      const payload = (beiBridge as any).getPayloadStatus(jobId);
      if (payload) return res.json({ success: true, payload });
      return res.status(404).json({ success: false, error: "Payload not found" });
    }
    const payloads = (beiBridge as any).getPayloadHistory();
    res.json({ success: true, count: payloads.length, payloads });
  });

  app.get("/api/bei/payload-status", (req, res) => {
    const jobId = req.query.jobId as string | undefined;
    if (jobId) {
      const payload = (beiBridge as any).getPayloadStatus(jobId);
      if (payload) return res.json({ success: true, payload });
      return res.status(404).json({ success: false, error: "Payload not found" });
    }
    const payloads = (beiBridge as any).getPayloadHistory();
    res.json({ success: true, count: payloads.length, payloads });
  });

  app.post("/api/bei/cancel", (req, res) => {
    const { jobId } = req.body;
    if (jobId && (beiBridge as any).pendingJobs?.has(jobId)) {
      const job = (beiBridge as any).pendingJobs.get(jobId);
      clearTimeout(job.timeoutTimer);
      (beiBridge as any).pendingJobs.delete(jobId);
      job.reject(new Error('Generation cancelled by user'));
    }
    if (beiBridge.isConnected()) {
      (beiBridge as any).extensionSocket?.send(JSON.stringify({
        type: 'CANCEL_GENERATION',
        data: { jobId }
      }));
    }
    res.json({ success: true, cancelled: jobId });
  });

  app.post("/api/bei/text", (req, res) => {
    beiBridge.handleTextRequest(req as any, res as any);
  });

  app.post("/api/bei/reset-session", (req, res) => {
    beiBridge.handleResetSessionRequest(req as any, res as any);
  });

  // API Routes
  app.get("/api/assets", (req, res) => {
    const assets = db.prepare("SELECT * FROM assets ORDER BY createdAt DESC").all();
    res.json(assets);
  });

  app.post("/api/assets", (req, res) => {
    const { id, name, prompt, type, imageUrl } = req.body;
    const stmt = db.prepare("INSERT INTO assets (id, name, prompt, type, imageUrl) VALUES (?, ?, ?, ?, ?)");
    stmt.run(id, name, prompt, type, imageUrl);
    res.json({ success: true });
  });

  app.delete("/api/assets/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM assets WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/config/gemini-key", (req, res) => {
    const { apiKey } = req.body;
    try {
      const envPath = path.join(__dirname, ".env.local");
      let content = "";
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, "utf8");
      }
      if (content.includes("GEMINI_API_KEY=")) {
        content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${apiKey || ""}`);
      } else {
        content = `${content.trim()}\nGEMINI_API_KEY=${apiKey || ""}\n`;
      }
      fs.writeFileSync(envPath, content.trim() + "\n");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
