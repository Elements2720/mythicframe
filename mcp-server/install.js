import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const configPath = path.join(os.homedir(), ".gemini", "config", "mcp_config.json");

console.log("Reading Antigravity MCP configuration...");

try {
  let configData = { mcpServers: {} };
  
  if (fs.existsSync(configPath)) {
    const rawData = fs.readFileSync(configPath, "utf-8");
    configData = JSON.parse(rawData);
  } else {
    console.log("No existing configuration found. Creating a new one...");
  }

  if (!configData.mcpServers) {
    configData.mcpServers = {};
  }

  const serverConfig = {
    command: "node",
    args: [
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "index.js")
    ],
    env: {
      NODE_ENV: "production"
    },
    type: "stdio",
    disabled: false
  };

  configData.mcpServers["mythic-image-gen"] = serverConfig;

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

  console.log("Successfully added 'mythic-image-gen' to Antigravity MCP servers!");
  console.log(`Config path: ${configPath}`);
} catch (error) {
  console.error("Failed to configure Antigravity MCP servers:", error.message);
}
