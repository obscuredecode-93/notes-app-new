import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import rateLimit from 'express-rate-limit';
import { getDb } from './db/database';
import notesRouter from './routes/notes';
import tagsRouter  from './routes/tags';
import { errorHandler, notFound } from './middleware/errorHandler';

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// In development CORS_ORIGIN is not set so all origins are allowed (wildcard).
// In production set CORS_ORIGIN to the exact Vercel URL.
const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(cors({
  origin: CORS_ORIGIN
    ? (origin, cb) => {
        // Allow requests with no Origin header (e.g. server-to-server, curl)
        // and requests from the configured frontend origin only.
        if (!origin || origin === CORS_ORIGIN) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
      }
    : '*', // dev: allow everything
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 200 requests per 15 minutes per IP.  Generous for a note-taking app used by
// one person; tight enough to slow down scripted abuse.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,  // return RateLimit-* headers
  legacyHeaders:   false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests — please slow down.' } },
  skip: () => process.env.NODE_ENV === 'test', // don't rate-limit tests
});
app.use(limiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' })); // generous but bounded

getDb();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/notes', notesRouter);
app.use('/tags',  tagsRouter);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`Notes API running on http://localhost:${PORT}`)
  );
}

export default app;
