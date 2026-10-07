import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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
  const app = express();
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.argv[2];
  const PORT = parseInt(portFromArg || process.env.PORT || "3000", 10);

  app.use(express.json({ limit: '50mb' }));

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
