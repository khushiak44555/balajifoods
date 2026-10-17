import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './db.js';

const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  await connectDB(process.env.MONGODB_URI);
  const app = createApp({ corsOrigins });
  const server = app.listen(PORT, () => {
    console.log(`[api] Balaji Foods server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // Print only the message: connection errors must not leak the URI.
  console.error('[api] Failed to start:', err.message);
  process.exit(1);
});
