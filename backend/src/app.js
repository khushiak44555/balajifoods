import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import ordersRouter from './routes/orders.js';
import dashboardRouter from './routes/dashboard.js';
import { MENU } from './menu.js';
import { HttpError } from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

export function createApp({ corsOrigins = [] } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and non-browser requests have no Origin header.
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    })
  );
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'connected' : 'disconnected' });
  });
  app.get('/api/menu', (req, res) => res.json({ menu: MENU }));
  app.use('/api/orders', ordersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Serve the built frontend when available (single-server production mode).
  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    app.use(express.static(FRONTEND_DIST));
    app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const message = Object.values(err.errors).map((e) => e.message).join('; ');
      return res.status(400).json({ error: message || 'Validation failed' });
    }
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ error: `Invalid value for ${err.path}` });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate order number, please retry' });
    }
    if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
      console.error('[api] Database unavailable:', err.message);
      return res.status(503).json({ error: 'Database is unavailable. Check the internet connection and try again.' });
    }
    console.error('[api] Unexpected error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
