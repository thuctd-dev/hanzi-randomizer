import express from 'express';
import cors from 'cors';
import lessonsRouter from './routes/lessons';
import topicsRouter from './routes/topics';
import vocabularyRouter from './routes/vocabulary';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin server calls)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────
app.use('/api/lessons',    lessonsRouter);
app.use('/api/topics',     topicsRouter);
app.use('/api/vocabulary', vocabularyRouter);

// ── 404 catch-all ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
