import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { buildingRoutes } from './routes/buildings.js';
import { featureRoutes } from './routes/features.js';
import { processDueTimerNotifications } from './services/timers.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => c.json({ status: 'ok', service: 'woeschplan-api' }));

app.route('/auth', authRoutes);

app.route('/buildings', buildingRoutes);
app.route('/', featureRoutes);

setInterval(() => {
  processDueTimerNotifications().catch(console.error);
}, 60_000);

const port = Number(process.env.PORT ?? 3001);
console.log(`Wöschplan API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
