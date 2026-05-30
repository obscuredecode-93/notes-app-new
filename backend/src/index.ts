import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import { getDb } from './db/database';
import notesRouter from './routes/notes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

getDb();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/notes', notesRouter);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`Notes API running on http://localhost:${PORT}`)
  );
}

export default app;
