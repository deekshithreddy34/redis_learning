import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { WebSocketManager } from "./WebSocketManager.js";
import { RedisManager } from "./RedisManager.js";

const app = express();
const server = createServer(app);

app.get("/", (_req, res) => {
  res.json({
    message: "WebSocket server is running",
    websocket: `ws://localhost:${process.env.PORT ?? 8080}`,
  });
});

const wsManager = new WebSocketManager(server);
const redisManager = new RedisManager(wsManager);

const PORT = Number(process.env.PORT ?? 8080);

async function startServer() {
  try {
    await redisManager.connect();

    server.listen(PORT, () => {
      console.log(`HTTP server: http://localhost:${PORT}`);
      console.log(`WebSocket server: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await redisManager.disconnect().catch(() => {});
    await wsManager.close().catch(() => {});
    process.exitCode = 1;
  }
}

async function shutdown() {
  console.log("Shutting down...");

  await redisManager.disconnect();
  await wsManager.close();

  server.close(() => {
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

void startServer();